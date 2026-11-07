from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import Appointment, BookingChannel, PatientProfile, User
from app.schemas import AppointmentCreate, AppointmentOut, BookingResult, RescheduleIn, TicketOut
from app.services import booking

router = APIRouter(prefix="/appointments", tags=["Lịch hẹn"])


@router.post("", response_model=BookingResult, status_code=status.HTTP_201_CREATED)
def create_appointment(
    body: AppointmentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    appointment, warnings = booking.create_appointment(
        db, user.id, booking.BookingRequest(**body.model_dump()), BookingChannel.web
    )
    return {"appointment": booking.describe(db, appointment), "warnings": warnings}


@router.get("", response_model=list[AppointmentOut])
def list_appointments(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[dict]:
    booking.expire_holds(db)
    appointments = db.scalars(
        select(Appointment)
        .join(PatientProfile, Appointment.profile_id == PatientProfile.id)
        .where(PatientProfile.user_id == user.id)
        .order_by(Appointment.slot_time.desc())
    ).all()
    return [booking.describe(db, appointment) for appointment in appointments]


@router.get("/{appointment_id}", response_model=AppointmentOut)
def get_appointment(
    appointment_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    booking.expire_holds(db)
    return booking.describe(db, booking.owned_appointment(db, user.id, appointment_id))


@router.get("/{appointment_id}/ticket", response_model=TicketOut)
def get_ticket(
    appointment_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return booking.ticket(db, user.id, appointment_id)


@router.post("/{appointment_id}/pay", response_model=AppointmentOut)
def pay(
    appointment_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return booking.describe(db, booking.pay_appointment(db, user.id, appointment_id))


@router.post("/{appointment_id}/cancel", response_model=AppointmentOut)
def cancel(
    appointment_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return booking.describe(db, booking.cancel_appointment(db, user.id, appointment_id))


@router.post("/{appointment_id}/reschedule", response_model=AppointmentOut)
def reschedule(
    appointment_id: int,
    body: RescheduleIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    appointment = booking.reschedule_appointment(
        db, user.id, appointment_id, body.session_id, body.slot_time
    )
    return booking.describe(db, appointment)
