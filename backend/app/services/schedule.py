from datetime import date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.config import settings
from app.models import ClinicSession, DoctorSchedule, Holiday, Shift

SATURDAY, SUNDAY = 5, 6


def session_window(day: date, shift: Shift, holidays: set[date]) -> tuple[time, time] | None:
    """Khung giờ của một buổi, None nếu ngày đó không khám."""
    # BR-03: Chủ nhật, ngày lễ không khám ngoại trú
    if day.weekday() == SUNDAY or day in holidays:
        return None
    # BR-02: thứ Bảy chỉ khám buổi sáng
    if day.weekday() == SATURDAY and shift == Shift.afternoon:
        return None
    # BR-01: khung giờ sáng, chiều
    if shift == Shift.morning:
        return settings.morning_start, settings.morning_end
    return settings.afternoon_start, settings.afternoon_end


def slot_times(start: time, end: time, slot_minutes: int) -> list[time]:
    """Chia một ca thành các slot (BR-05)."""
    current = datetime.combine(date.min, start)
    stop = datetime.combine(date.min, end)
    step = timedelta(minutes=slot_minutes)
    slots = []
    while current + step <= stop:
        slots.append(current.time())
        current += step
    return slots


def generate_sessions(db: Session, start: date, days: int) -> int:
    """Sinh ca khám từ mẫu tuần (BR-08). Chạy lại nhiều lần không tạo trùng."""
    holidays = set(db.scalars(select(Holiday.date)))
    schedules = db.scalars(select(DoctorSchedule)).all()

    rows = []
    for offset in range(days):
        day = start + timedelta(days=offset)
        for schedule in schedules:
            if schedule.weekday != day.weekday():
                continue
            window = session_window(day, schedule.shift, holidays)
            if window is None:
                continue
            rows.append(
                {
                    "schedule_id": schedule.id,
                    "doctor_id": schedule.doctor_id,
                    "room_id": schedule.room_id,
                    "service_type_id": schedule.service_type_id,
                    "date": day,
                    "start_time": window[0],
                    "end_time": window[1],
                    "slot_minutes": schedule.slot_minutes,
                    "capacity_per_slot": schedule.capacity_per_slot,
                }
            )
    if not rows:
        return 0

    statement = (
        insert(ClinicSession)
        .values(rows)
        .on_conflict_do_nothing(index_elements=["doctor_id", "date", "start_time"])
        .returning(ClinicSession.id)
    )
    return len(db.execute(statement).all())
