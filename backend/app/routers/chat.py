import uuid
from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_optional_user
from app.models import ChatMessage, ChatRole, ChatSession, User
from app.schemas import ChatIn, ChatMessageOut, ChatReply, ChatSessionOut
from app.services import agent
from app.services.prompts import ERROR_REPLY

router = APIRouter(prefix="/chat", tags=["Chatbot"])


def accessible_session(db: Session, session_id: uuid.UUID, user: User | None) -> ChatSession:
    chat = db.get(ChatSession, session_id)
    if chat is None or (chat.user_id is not None and (user is None or chat.user_id != user.id)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Không tìm thấy phiên chat")
    # A2: khách đăng nhập giữa chừng thì phiên chat được gắn vào tài khoản, giữ ngữ cảnh
    if chat.user_id is None and user is not None:
        chat.user_id = user.id
        db.commit()
    return chat


@router.post("/sessions", response_model=ChatSessionOut, status_code=status.HTTP_201_CREATED)
def create_session(
    user: User | None = Depends(get_optional_user), db: Session = Depends(get_db)
) -> ChatSession:
    chat = ChatSession(user_id=user.id if user else None)
    db.add(chat)
    db.commit()
    return chat


@router.get("/sessions/{session_id}/messages", response_model=list[ChatMessageOut])
def history(
    session_id: uuid.UUID,
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    chat = accessible_session(db, session_id, user)
    rows = db.scalars(
        select(ChatMessage)
        .where(ChatMessage.session_id == chat.id, ChatMessage.role != ChatRole.tool)
        .order_by(ChatMessage.id)
    )
    return [
        {
            "role": row.role.value,
            "content": row.content,
            "cards": (row.meta or {}).get("cards", []),
            "sources": row.sources or [],
            "created_at": row.created_at,
        }
        for row in rows
        if row.content
    ]


@router.post("/sessions/{session_id}/messages", response_model=ChatReply)
def send_message(
    session_id: uuid.UUID,
    body: ChatIn,
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> dict:
    chat = accessible_session(db, session_id, user)
    try:
        result = agent.run_turn(db, chat, body.message, user.id if user else None)
    except agent.AgentUnavailable as error:
        # E6: báo lỗi và hướng người bệnh sang form đặt lịch
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, ERROR_REPLY) from error
    return asdict(result)
