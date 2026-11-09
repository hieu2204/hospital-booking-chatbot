"""Vòng lặp chatbot (UC-05 đến UC-09).

- Kiểm tra cấp cứu chạy trước khi tin nhắn tới LLM (BR-30).
- Lịch sử chỉ thêm vào, phát lại nguyên văn các khối API kể cả thinking: Sonnet 5.5 và
  Haiku 5.5 từ chối lịch sử bị sửa.
- Tool chạy trên session database riêng, nên lỗi API giữa lượt không để lại lịch sử dở dang.
"""

from dataclasses import dataclass, field
from functools import lru_cache

import anthropic
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import clock
from app.config import settings
from app.db import SessionLocal
from app.models import ChatMessage, ChatRole, ChatSession
from app.services import chat_tools, prompts
from app.services.safety import check_message
from app.services.text import mask_pii

API_ROLE = {ChatRole.user: "user", ChatRole.tool: "user", ChatRole.assistant: "assistant"}


class AgentUnavailable(Exception):
    pass


@dataclass
class TurnResult:
    reply: str
    cards: list[dict] = field(default_factory=list)
    sources: list[dict] = field(default_factory=list)
    emergency: bool = False


@lru_cache
def get_client() -> anthropic.Anthropic:
    return anthropic.Anthropic()


def call_model(**kwargs):
    """Sonnet 5.5 bật server-side fallback; Haiku 5.5 không hỗ trợ tham số này."""
    client = get_client()
    if kwargs["model"].startswith("claude-sonnet-5-5"):
        return client.beta.messages.create(
            **kwargs, betas=["server-side-fallback-2026-07-01"], fallbacks="default"
        )
    return client.messages.create(**kwargs)


def context_line(user_id: int | None) -> str:
    now = clock.now()
    weekday = chat_tools.WEEKDAYS[now.weekday()]
    login = "đã đăng nhập" if user_id else "chưa đăng nhập"
    return f"[Bối cảnh: hôm nay là {weekday} {now:%d/%m/%Y}, {now:%H:%M}. Người dùng {login}.]"


def load_history(db: Session, chat_session_id) -> list[dict]:
    rows = db.scalars(
        select(ChatMessage)
        .where(ChatMessage.session_id == chat_session_id)
        .order_by(ChatMessage.id)
    )
    return [{"role": API_ROLE[row.role], "content": row.blocks} for row in rows]


def dump_blocks(content) -> list[dict]:
    return [block.model_dump(mode="json", exclude_none=True) for block in content]


def usage_cost(model: str, usage) -> dict:
    tokens = {
        "input": usage.input_tokens or 0,
        "output": usage.output_tokens or 0,
        "cache_write": usage.cache_creation_input_tokens or 0,
        "cache_read": usage.cache_read_input_tokens or 0,
    }
    price_in, price_out = settings.model_prices.get(model, (0.0, 0.0))
    cost = (
        tokens["input"] * price_in
        + tokens["cache_write"] * price_in * 1.25
        + tokens["cache_read"] * price_in * 0.1
        + tokens["output"] * price_out
    ) / 1_000_000
    return {**tokens, "cost_usd": cost}


def add_usage(total: dict, step: dict) -> dict:
    return {key: total.get(key, 0) + value for key, value in step.items()}


def run_turn(db: Session, chat: ChatSession, user_text: str, user_id: int | None) -> TurnResult:
    text = mask_pii(user_text)[: settings.chat_max_message_chars]
    db.add(
        ChatMessage(
            session_id=chat.id,
            role=ChatRole.user,
            content=text,
            blocks=[{"type": "text", "text": f"{context_line(user_id)}\n{text}"}],
        )
    )

    safety = check_message(text)
    if safety.is_emergency:
        cards = [{"type": "emergency", "category": safety.category}]
        db.add(
            ChatMessage(
                session_id=chat.id,
                role=ChatRole.assistant,
                content=safety.message,
                blocks=[{"type": "text", "text": safety.message}],
                meta={"emergency": safety.category, "cards": cards},
            )
        )
        db.commit()
        return TurnResult(reply=safety.message, cards=cards, emergency=True)

    db.flush()
    messages = load_history(db, chat.id)
    model = settings.chat_model
    replies: list[str] = []
    usage: dict = {}

    with SessionLocal() as tool_db:
        ctx = chat_tools.ToolContext(db=tool_db, user_id=user_id, chat_session_id=chat.id)
        for _ in range(settings.chat_max_steps):
            try:
                response = call_model(
                    model=model,
                    max_tokens=settings.chat_max_tokens,
                    system=prompts.SYSTEM_PROMPT,
                    tools=chat_tools.TOOLS,
                    messages=messages,
                    output_config={"effort": settings.chat_effort},
                    cache_control={"type": "ephemeral"},
                )
            except anthropic.APIError as error:
                db.rollback()
                raise AgentUnavailable(str(error)) from error

            usage = add_usage(usage, usage_cost(model, response.usage))
            blocks = dump_blocks(response.content)
            visible = "\n\n".join(b.text for b in response.content if b.type == "text").strip()

            if response.stop_reason == "refusal":
                replies.append(prompts.REFUSAL_REPLY)
                # Lượt bị từ chối có thể rỗng; API không nhận khối assistant rỗng ở lượt sau
                blocks = blocks or [{"type": "text", "text": prompts.REFUSAL_REPLY}]
            elif visible:
                replies.append(visible)

            assistant = {"role": "assistant", "content": blocks}
            messages.append(assistant)
            assistant_row = ChatMessage(
                session_id=chat.id, role=ChatRole.assistant, content=visible, blocks=blocks
            )
            db.add(assistant_row)

            if response.stop_reason == "pause_turn":
                continue
            if response.stop_reason != "tool_use":
                break

            results, calls = [], []
            for block in response.content:
                if block.type != "tool_use":
                    continue
                output, is_error = chat_tools.run_tool(ctx, block.name, block.input)
                results.append(
                    {"type": "tool_result", "tool_use_id": block.id, "content": output, "is_error": is_error}
                )
                calls.append({"name": block.name, "input": block.input, "is_error": is_error, "output": output[:2000]})
            assistant_row.tool_calls = calls
            messages.append({"role": "user", "content": results})
            db.add(ChatMessage(session_id=chat.id, role=ChatRole.tool, content="", blocks=results))
        else:
            replies.append(prompts.STEP_LIMIT_REPLY)

        reply = "\n\n".join(replies) or prompts.STEP_LIMIT_REPLY
        assistant_row.content = reply
        assistant_row.sources = ctx.sources
        assistant_row.meta = {"model": model, "usage": usage, "cards": ctx.cards}
        db.commit()
        return TurnResult(reply=reply, cards=ctx.cards, sources=ctx.sources)
