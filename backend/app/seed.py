"""Tạo dữ liệu mẫu. Chạy: python -m app.seed

Tên bác sĩ và người bệnh đều là giả định. Chạy lại không tạo trùng: danh mục chỉ
tạo một lần, ca khám được sinh bù cho những ngày còn thiếu.
"""

import random
from datetime import date, datetime

import bcrypt
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal
from app.models import (
    ClinicSession,
    Department,
    Doctor,
    DoctorSchedule,
    Facility,
    Holiday,
    PatientProfile,
    Room,
    ServicePrice,
    ServiceType,
    Shift,
    User,
    UserRole,
)
from app.services.schedule import SATURDAY, generate_sessions

# "Khám bệnh" là khoa dự phòng khi bot không xác định được chuyên khoa (UC-06)
DEPARTMENTS = [
    ("Khám bệnh", "Khám ban đầu, chuyển đến chuyên khoa phù hợp"),
    ("Nội Tim mạch", "Tăng huyết áp, đau ngực, hồi hộp, suy tim"),
    ("Tiêu hóa", "Đau dạ dày, trào ngược, rối loạn tiêu hóa"),
    ("Hô hấp", "Ho kéo dài, hen, viêm phổi, khó thở mạn tính"),
    ("Nội tiết", "Đái tháo đường, bệnh tuyến giáp"),
    ("Thần kinh", "Đau đầu, chóng mặt, tê bì, mất ngủ"),
    ("Nội Cơ xương khớp", "Đau khớp, gút, loãng xương"),
    ("Tai Mũi Họng", "Viêm họng, viêm xoang, ù tai"),
    ("Mắt", "Giảm thị lực, đỏ mắt, đục thủy tinh thể"),
    ("Da liễu - Thẩm mỹ da", "Dị ứng da, mụn, nấm da"),
    ("Phụ sản", "Khám phụ khoa, theo dõi thai"),
    ("Tiết niệu", "Sỏi thận, tiểu buốt, tiền liệt tuyến"),
    ("Phẫu thuật Hàm mặt - Răng hàm mặt", "Đau răng, răng khôn, bệnh lý hàm mặt"),
]

# Tên hình thức khám, nhận BHYT, chọn bác sĩ, giá (BR-18, BR-18a)
SERVICE_TYPES = [
    ("Khám thường", True, False, 150_000),
    ("Phòng khám Chuyên gia", False, True, 300_000),
    ("Tái khám", True, True, 150_000),
]

# Ngày nghỉ dùng cho demo
HOLIDAYS = [
    (date(2027, 1, 1), "Tết Dương lịch"),
    (date(2027, 2, 5), "Tết Nguyên đán"),
    (date(2027, 2, 6), "Tết Nguyên đán"),
    (date(2027, 2, 7), "Tết Nguyên đán"),
    (date(2027, 2, 8), "Tết Nguyên đán"),
    (date(2027, 2, 9), "Tết Nguyên đán"),
    (date(2027, 4, 16), "Giỗ Tổ Hùng Vương"),
    (date(2027, 4, 30), "Ngày Giải phóng miền Nam"),
    (date(2027, 5, 1), "Quốc tế Lao động"),
    (date(2027, 9, 2), "Quốc khánh"),
]

FAMILY_NAMES = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Phan", "Vũ", "Đặng", "Bùi", "Đỗ"]
MIDDLE_NAMES = ["Văn", "Thị", "Minh", "Thanh", "Quốc", "Ngọc", "Hữu", "Thu", "Đức", "Hải"]
GIVEN_NAMES = ["An", "Bình", "Châu", "Dũng", "Giang", "Hà", "Khoa", "Lan", "Mai", "Nam",
               "Oanh", "Phúc", "Quân", "Sơn", "Tâm", "Uyên", "Vinh", "Yến"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def doctor_weekly_slots(dept_index: int, doctor_index: int) -> list[tuple[int, Shift, str]]:
    """Mẫu lịch tuần: bác sĩ 0, 1 khám thường và tái khám, bác sĩ 2 là chuyên gia."""
    d = dept_index
    if doctor_index == 0:
        slots = [
            (d % 5, Shift.morning, "Khám thường"),
            ((d + 2) % 5, Shift.afternoon, "Khám thường"),
            ((d + 3) % 5, Shift.morning, "Tái khám"),
        ]
        if d % 2 == 0:
            slots.append((SATURDAY, Shift.morning, "Khám thường"))
        return slots
    if doctor_index == 1:
        slots = [
            ((d + 1) % 5, Shift.morning, "Khám thường"),
            ((d + 3) % 5, Shift.afternoon, "Khám thường"),
            ((d + 4) % 5, Shift.afternoon, "Tái khám"),
        ]
        if d % 2 == 1:
            slots.append((SATURDAY, Shift.morning, "Khám thường"))
        return slots
    return [
        ((d + 2) % 5, Shift.morning, "Phòng khám Chuyên gia"),
        ((d + 4) % 5, Shift.afternoon, "Phòng khám Chuyên gia"),
    ]


def seed_catalog(db: Session) -> None:
    rng = random.Random(2026)
    used_names: set[str] = set()

    def fake_name() -> str:
        while True:
            name = " ".join(
                [rng.choice(FAMILY_NAMES), rng.choice(MIDDLE_NAMES), rng.choice(GIVEN_NAMES)]
            )
            if name not in used_names:
                used_names.add(name)
                return name

    facility = Facility(
        name="Bệnh viện Demo - Cơ sở 1",
        address="215 Hồng Bàng, Phường Chợ Lớn, TP.HCM",
        hotline="1900 2827",
    )
    db.add(facility)

    services = {}
    for name, allow_bhyt, choose_doctor, _ in SERVICE_TYPES:
        services[name] = ServiceType(name=name, allow_bhyt=allow_bhyt, choose_doctor=choose_doctor)
    db.add_all(services.values())
    db.add_all(Holiday(date=day, name=name) for day, name in HOLIDAYS)
    db.flush()

    for dept_index, (dept_name, description) in enumerate(DEPARTMENTS):
        department = Department(facility_id=facility.id, name=dept_name, description=description)
        db.add(department)
        db.flush()

        db.add_all(
            ServicePrice(
                department_id=department.id, service_type_id=services[name].id, amount=amount
            )
            for name, _, _, amount in SERVICE_TYPES
        )

        for doctor_index in range(3):
            is_expert = doctor_index == 2
            doctor = Doctor(
                department_id=department.id,
                title="PGS.TS.BS." if is_expert else "ThS.BS.",
                full_name=fake_name(),
                bio=f"Bác sĩ giả định của khoa {dept_name}, dùng cho demo.",
            )
            room = Room(
                department_id=department.id,
                name=f"Phòng {(dept_index + 1) * 10 + doctor_index + 1}",
                area="Khu A",
                floor=f"Lầu {dept_index % 4 + 1}",
            )
            db.add_all([doctor, room])
            db.flush()

            db.add_all(
                DoctorSchedule(
                    doctor_id=doctor.id,
                    room_id=room.id,
                    service_type_id=services[service_name].id,
                    weekday=weekday,
                    shift=shift,
                    slot_minutes=settings.slot_minutes,
                    capacity_per_slot=settings.capacity_per_slot,
                )
                for weekday, shift, service_name in doctor_weekly_slots(dept_index, doctor_index)
            )

    password = hash_password(settings.seed_password)
    admin = User(
        phone="0900000001", password_hash=password, role=UserRole.admin, full_name="Quản trị Demo"
    )
    patient = User(
        phone="0900000002", password_hash=password, role=UserRole.patient, full_name="Người Bệnh Demo"
    )
    db.add_all([admin, patient])
    db.flush()
    db.add_all(
        [
            PatientProfile(
                user_id=patient.id,
                full_name="Người Bệnh Demo",
                dob=date(1995, 5, 20),
                gender="Nam",
                relation="Bản thân",
                phone=patient.phone,
            ),
            PatientProfile(
                user_id=patient.id,
                full_name="Mẹ Người Bệnh Demo",
                dob=date(1965, 3, 12),
                gender="Nữ",
                relation="Mẹ",
                phone=patient.phone,
            ),
        ]
    )


def main() -> None:
    with SessionLocal() as db:
        if db.scalar(select(func.count()).select_from(Facility)) == 0:
            seed_catalog(db)
            db.flush()
            print("Đã tạo danh mục")

        today = datetime.now(settings.tz).date()
        created = generate_sessions(db, today, settings.booking_window_days + 1)
        db.commit()

        total = db.scalar(select(func.count()).select_from(ClinicSession))
        print(f"Tạo thêm {created} ca khám, tổng cộng {total} ca")


if __name__ == "__main__":
    main()
