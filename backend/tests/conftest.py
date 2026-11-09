"""Test chạy trên database riêng chatbot_test, không đụng dữ liệu dev."""

import os
from datetime import date, datetime, time
from types import SimpleNamespace

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

url = make_url(os.environ["DATABASE_URL"])
TEST_DB = "chatbot_test"
os.environ["DATABASE_URL"] = url.set(database=TEST_DB).render_as_string(hide_password=False)
os.environ["PRELOAD_EMBEDDING"] = "false"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import clock, models  # noqa: E402
from app.config import settings  # noqa: E402
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.security import create_access_token, encrypt  # noqa: E402

# Thứ Hai, 10h00
NOW = datetime(2026, 11, 9, 10, 0, tzinfo=settings.tz)
WEDNESDAY = date(2026, 11, 11)
THURSDAY = date(2026, 11, 12)
TOMORROW = date(2026, 11, 10)


def at(day: date, hour: int, minute: int = 0) -> datetime:
    return datetime.combine(day, time(hour, minute), tzinfo=settings.tz)


def set_now(monkeypatch, value: datetime) -> None:
    monkeypatch.setattr(clock, "now", lambda: value)


@pytest.fixture(scope="session", autouse=True)
def test_database():
    admin = create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin.connect() as connection:
        connection.execute(text(f"DROP DATABASE IF EXISTS {TEST_DB} WITH (FORCE)"))
        connection.execute(text(f"CREATE DATABASE {TEST_DB}"))
    admin.dispose()
    with engine.begin() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    Base.metadata.create_all(engine)


@pytest.fixture(autouse=True)
def clean_tables(test_database):
    tables = ", ".join(table.name for table in Base.metadata.sorted_tables)
    with engine.begin() as connection:
        connection.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))


@pytest.fixture(autouse=True)
def frozen_clock(monkeypatch):
    set_now(monkeypatch, NOW)


@pytest.fixture
def client():
    return TestClient(app)


def add_user(db, phone: str, role=models.UserRole.patient) -> models.User:
    user = models.User(phone=phone, password_hash="x", role=role, full_name="Người Thử")
    db.add(user)
    db.flush()
    return user


def add_profile(db, user: models.User, with_bhyt: bool = True) -> models.PatientProfile:
    profile = models.PatientProfile(
        user_id=user.id,
        full_name="Hồ Sơ Thử",
        dob=date(1990, 1, 1),
        gender="Nam",
        relation="Bản thân",
        bhyt_code_enc=encrypt("DN4797912345678") if with_bhyt else None,
        bhyt_rate=80 if with_bhyt else None,
        id_images_at=NOW if with_bhyt else None,
    )
    db.add(profile)
    db.flush()
    return profile


def add_session(db, world, day: date, service=None, doctor=None, capacity=3) -> models.ClinicSession:
    session = models.ClinicSession(
        doctor_id=(doctor or world.doctor).id,
        room_id=world.room.id,
        service_type_id=(service or world.normal).id,
        date=day,
        start_time=time(7, 0),
        end_time=time(12, 0),
        slot_minutes=30,
        capacity_per_slot=capacity,
    )
    db.add(session)
    db.flush()
    return session


def auth(user: models.User) -> dict:
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


@pytest.fixture
def world():
    """Một khoa, hai bác sĩ, ba hình thức khám, bệnh nhân và các ca khám mẫu."""
    with SessionLocal() as db:
        facility = models.Facility(name="Demo", address="Địa chỉ", hotline="1900")
        db.add(facility)
        db.flush()
        department = models.Department(facility_id=facility.id, name="Tiêu hóa")
        other_department = models.Department(facility_id=facility.id, name="Mắt")
        db.add_all([department, other_department])
        db.flush()
        room = models.Room(department_id=department.id, name="Phòng 1")
        other_room = models.Room(department_id=other_department.id, name="Phòng 2")
        normal = models.ServiceType(name="Khám thường", allow_bhyt=True, choose_doctor=False)
        expert = models.ServiceType(name="Chuyên gia", allow_bhyt=False, choose_doctor=True)
        doctor = models.Doctor(department_id=department.id, title="BS.", full_name="An")
        substitute = models.Doctor(department_id=department.id, title="BS.", full_name="Bình")
        other_doctor = models.Doctor(department_id=other_department.id, title="BS.", full_name="Chi")
        db.add_all([room, other_room, normal, expert, doctor, substitute, other_doctor])
        db.flush()
        for dept in (department, other_department):
            db.add(models.ServicePrice(
                department_id=dept.id, service_type_id=normal.id, amount=150_000
            ))
            db.add(models.ServicePrice(
                department_id=dept.id, service_type_id=expert.id, amount=300_000
            ))

        patient = add_user(db, "0911111111")
        stranger = add_user(db, "0922222222")
        admin = add_user(db, "0933333333", models.UserRole.admin)
        profile = add_profile(db, patient)
        no_bhyt_profile = add_profile(db, patient, with_bhyt=False)

        w = SimpleNamespace(
            room=room, other_room=other_room, normal=normal, expert=expert, doctor=doctor,
            substitute=substitute, other_doctor=other_doctor, department=department,
            patient=patient, stranger=stranger, admin=admin, profile=profile,
            no_bhyt_profile=no_bhyt_profile,
        )
        w.wed = add_session(db, w, WEDNESDAY)
        w.thu = add_session(db, w, THURSDAY)
        w.tomorrow = add_session(db, w, TOMORROW)
        w.expert_wed = add_session(db, w, WEDNESDAY, service=expert, doctor=substitute)
        db.commit()
        w.headers = auth(patient)
        w.stranger_headers = auth(stranger)
        w.admin_headers = auth(admin)
        return w


def book(client, world, session=None, hour=8, minute=0, profile=None, headers=None, **extra):
    session = session or world.wed
    body = {
        "profile_id": (profile or world.profile).id,
        "session_id": session.id,
        "slot_time": at(session.date, hour, minute).isoformat(),
        **extra,
    }
    return client.post("/appointments", json=body, headers=headers or world.headers)


def book_ok(client, world, **kwargs) -> dict:
    response = book(client, world, **kwargs)
    assert response.status_code == 201, response.json()
    return response.json()["appointment"]


def pay(client, world, appointment: dict, headers=None) -> dict:
    response = client.post(
        f"/appointments/{appointment['id']}/pay", headers=headers or world.headers
    )
    assert response.status_code == 200, response.json()
    return response.json()
