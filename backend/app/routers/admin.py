from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import require_admin
from app.schemas import AppointmentOut, LockSessionIn
from app.services import booking

router = APIRouter(prefix="/admin", tags=["Quản trị"], dependencies=[Depends(require_admin)])


@router.post("/sessions/{session_id}/lock")
def lock_session(session_id: int, body: LockSessionIn, db: Session = Depends(get_db)) -> dict:
    """Bác sĩ nghỉ: có bác sĩ khám thay thì giữ nguyên lịch, không thì khóa ca."""
    if body.substitute_doctor_id is not None:
        session = booking.set_substitute(db, session_id, body.substitute_doctor_id)
    else:
        session = booking.lock_session(db, session_id)
    return {
        "id": session.id,
        "status": session.status,
        "substitute_doctor_id": session.substitute_doctor_id,
    }


@router.post("/appointments/{appointment_id}/complete", response_model=AppointmentOut)
def complete(appointment_id: int, db: Session = Depends(get_db)) -> dict:
    return booking.describe(db, booking.complete_appointment(db, appointment_id))
