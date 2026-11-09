from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import require_admin
from app.models import Appointment, ClinicSession, Department, Doctor, Room, ServiceType
from app.schemas import AppointmentOut, LockSessionIn
from app.services import booking, knowledge
from app.usage_report import summarize

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


@router.get("/sessions")
def list_sessions(day: date, db: Session = Depends(get_db)) -> list[dict]:
    """Ca khám trong một ngày kèm số lịch đang giữ chỗ (FR-25)."""
    booked = dict(
        db.execute(
            select(Appointment.session_id, func.count())
            .where(Appointment.status.in_(booking.ACTIVE_STATUSES))
            .group_by(Appointment.session_id)
        ).all()
    )
    doctors = {doctor.id: doctor for doctor in db.scalars(select(Doctor))}
    rows = db.execute(
        select(ClinicSession, Room, Department.name, ServiceType.name)
        .join(Room, ClinicSession.room_id == Room.id)
        .join(Department, Room.department_id == Department.id)
        .join(ServiceType, ClinicSession.service_type_id == ServiceType.id)
        .where(ClinicSession.date == day)
        .order_by(Department.id, ClinicSession.start_time)
    ).all()

    def name(doctor_id: int | None) -> str | None:
        doctor = doctors.get(doctor_id)
        return f"{doctor.title} {doctor.full_name}" if doctor else None

    result = []
    for session, room, department, service in rows:
        slots = len(booking.slot_times(session.start_time, session.end_time, session.slot_minutes))
        result.append({
            "id": session.id,
            "department_id": room.department_id,
            "department": department,
            "doctor": name(session.doctor_id),
            "substitute": name(session.substitute_doctor_id),
            "room": room.name,
            "service_type": service,
            "start_time": session.start_time.isoformat(timespec="minutes"),
            "end_time": session.end_time.isoformat(timespec="minutes"),
            "status": session.status.value,
            "booked": booked.get(session.id, 0),
            "capacity": slots * session.capacity_per_slot,
        })
    return result


@router.get("/appointments", response_model=list[AppointmentOut])
def list_appointments(day: date, db: Session = Depends(get_db)) -> list[dict]:
    """Lịch hẹn trong ngày (FR-26)."""
    appointments = db.scalars(
        select(Appointment)
        .join(ClinicSession, Appointment.session_id == ClinicSession.id)
        .where(ClinicSession.date == day)
        .order_by(Appointment.slot_time)
    )
    return [booking.describe(db, appointment) for appointment in appointments]


@router.post("/knowledge/reindex")
def reindex(db: Session = Depends(get_db)) -> dict:
    """FR-27: đồng bộ lại thư mục knowledge/."""
    return knowledge.index_directory(db)


@router.get("/usage")
def usage() -> dict:
    """Token và chi phí Claude đã dùng, theo mô hình."""
    return summarize()
