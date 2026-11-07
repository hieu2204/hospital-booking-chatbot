from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Department, Doctor, DoctorSchedule, Room, ServiceType
from app.schemas import DepartmentOut, DoctorOut, ServiceTypeOut, SlotOut, WeeklySlotOut
from app.services.booking import available_slots

router = APIRouter(tags=["Tra cứu"])


@router.get("/departments", response_model=list[DepartmentOut])
def list_departments(db: Session = Depends(get_db)) -> list[Department]:
    return db.scalars(select(Department).order_by(Department.id)).all()


@router.get("/service-types", response_model=list[ServiceTypeOut])
def list_service_types(db: Session = Depends(get_db)) -> list[ServiceType]:
    return db.scalars(select(ServiceType).order_by(ServiceType.id)).all()


@router.get("/doctors", response_model=list[DoctorOut])
def list_doctors(
    department_id: int | None = None, db: Session = Depends(get_db)
) -> list[DoctorOut]:
    query = select(Doctor).order_by(Doctor.id)
    if department_id is not None:
        query = query.where(Doctor.department_id == department_id)
    doctors = db.scalars(query).all()

    weekly: dict[int, list[WeeklySlotOut]] = {doctor.id: [] for doctor in doctors}
    rows = db.execute(
        select(DoctorSchedule, ServiceType.name, Room.name)
        .join(ServiceType, DoctorSchedule.service_type_id == ServiceType.id)
        .join(Room, DoctorSchedule.room_id == Room.id)
        .where(DoctorSchedule.doctor_id.in_(weekly))
        .order_by(DoctorSchedule.weekday, DoctorSchedule.shift)
    )
    for schedule, service_name, room_name in rows:
        weekly[schedule.doctor_id].append(
            WeeklySlotOut(
                weekday=schedule.weekday,
                shift=schedule.shift,
                service_type=service_name,
                room=room_name,
            )
        )
    return [
        DoctorOut(
            id=doctor.id,
            department_id=doctor.department_id,
            title=doctor.title,
            full_name=doctor.full_name,
            bio=doctor.bio,
            schedule=weekly[doctor.id],
        )
        for doctor in doctors
    ]


@router.get("/slots", response_model=list[SlotOut])
def list_slots(
    department_id: int | None = None,
    doctor_id: int | None = None,
    service_type_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
) -> list[dict]:
    return available_slots(db, department_id, doctor_id, service_type_id, date_from, date_to)
