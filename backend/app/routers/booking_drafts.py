import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import BookingResult, DraftOut
from app.services import booking

router = APIRouter(prefix="/booking-drafts", tags=["Bản nháp đặt lịch"])


@router.get("/{draft_id}", response_model=DraftOut)
def get_draft(
    draft_id: uuid.UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    return booking.describe_draft(db, booking.owned_draft(db, user.id, draft_id))


@router.post("/{draft_id}/confirm", response_model=BookingResult)
def confirm(
    draft_id: uuid.UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    """Nút Xác nhận trên thẻ tóm tắt gọi thẳng endpoint này, không qua LLM (BR-32)."""
    appointment, warnings = booking.confirm_draft(db, user.id, draft_id)
    return {"appointment": booking.describe(db, appointment), "warnings": warnings}


@router.post("/{draft_id}/discard", status_code=status.HTTP_204_NO_CONTENT)
def discard(
    draft_id: uuid.UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> None:
    """Nút Sửa: bỏ bản nháp để chọn lại (A8)."""
    booking.owned_draft(db, user.id, draft_id)
    booking.discard_draft(db, draft_id)
