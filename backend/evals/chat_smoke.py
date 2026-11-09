"""Chạy thử chatbot với Claude thật, có tốn tiền API. Dùng tài khoản bệnh nhân demo.

Chạy: CHAT_MODEL=claude-haiku-5-5 python -m evals.chat_smoke [tên kịch bản ...]
"""

import sys

from sqlalchemy import select

from app.config import settings
from app.db import SessionLocal
from app.models import ChatMessage, ChatSession, User
from app.services import agent

SCENARIOS = {
    "bhyt": ["Không có giấy chuyển tuyến thì mình khám BHYT được không?"],
    "dat_lich": [
        "Mình bị đau dạ dày, ợ chua mấy hôm nay. Muốn đặt khám cho bản thân vào buổi sáng gần nhất, không dùng bảo hiểm.",
        "Lấy giờ sớm nhất giúp mình",
    ],
    "ngoai_pham_vi": ["Viết giúp mình đoạn code Python sắp xếp mảng"],
}


def main() -> None:
    names = sys.argv[1:] or list(SCENARIOS)
    print(f"Mô hình: {settings.chat_model}, effort {settings.chat_effort}\n")
    total = 0.0
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.phone == "0900000002"))
        for name in names:
            chat = ChatSession(user_id=user.id)
            db.add(chat)
            db.commit()
            print(f"=== {name} ===")
            seen = 0
            for message in SCENARIOS[name]:
                result = agent.run_turn(db, chat, message, user.id)
                row = db.scalars(
                    select(ChatMessage)
                    .where(ChatMessage.session_id == chat.id, ChatMessage.meta.is_not(None))
                    .order_by(ChatMessage.id.desc())
                ).first()
                calls = db.scalars(
                    select(ChatMessage.tool_calls).where(
                        ChatMessage.session_id == chat.id, ChatMessage.tool_calls.is_not(None)
                    )
                ).all()[seen:]
                seen += len(calls)
                usage = (row.meta or {}).get("usage", {})
                total += usage.get("cost_usd", 0)
                print(f"> {message}")
                print(f"  tool: {[c['name'] + ('!' if c['is_error'] else '') for batch in calls for c in batch]}")
                print(f"  thẻ: {[card['type'] for card in result.cards]}")
                print(f"  nguồn: {[s['title'] for s in result.sources]}")
                print(f"  token vào {usage.get('input', 0)}, cache đọc {usage.get('cache_read', 0)}, "
                      f"ghi {usage.get('cache_write', 0)}, ra {usage.get('output', 0)}, ${usage.get('cost_usd', 0):.4f}")
                print("  " + result.reply.replace("\n", "\n  ") + "\n")
    print(f"Tổng chi phí lần chạy: ${total:.4f}")


if __name__ == "__main__":
    main()
