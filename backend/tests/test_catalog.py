from datetime import date

from app.db import SessionLocal
from app.models import DoctorSchedule, Shift
from tests.conftest import NOW, at, book_ok, set_now


def slots(client, **params):
    return client.get("/slots", params=params).json()


def test_fr04_tra_cuu_khong_can_dang_nhap(client, world):
    assert len(client.get("/departments").json()) == 2
    assert len(client.get("/service-types").json()) == 2


def test_fr04_bac_si_kem_lich_tuan(client, world):
    with SessionLocal() as db:
        db.add(
            DoctorSchedule(
                doctor_id=world.doctor.id,
                room_id=world.room.id,
                service_type_id=world.normal.id,
                weekday=0,
                shift=Shift.morning,
                slot_minutes=30,
                capacity_per_slot=3,
            )
        )
        db.commit()
    doctors = client.get("/doctors", params={"department_id": world.department.id}).json()
    assert len(doctors) == 2
    assert doctors[0]["schedule"][0]["weekday"] == 0
    assert doctors[0]["schedule"][0]["room"] == "Phòng 1"


def test_fr18_slot_tru_so_cho_da_dat(client, world):
    book_ok(client, world, hour=8)
    wednesday = slots(
        client, doctor_id=world.doctor.id, date_from="2026-11-11", date_to="2026-11-11"
    )
    assert len(wednesday) == 10
    eight = next(slot for slot in wednesday if "T08:00" in slot["slot_time"])
    assert eight["remaining"] == 2
    assert eight["price"] == 150_000


def test_fr18_slot_het_cho_khong_hien(client, world):
    from tests.conftest import add_profile

    with SessionLocal() as db:
        profiles = [add_profile(db, world.patient) for _ in range(3)]
        db.commit()
    for profile in profiles:
        book_ok(client, world, hour=8, profile=profile)
    wednesday = slots(
        client, doctor_id=world.doctor.id, date_from="2026-11-11", date_to="2026-11-11"
    )
    assert len(wednesday) == 9


def test_br07_slot_chi_hien_tu_ngay_mai(client, world):
    days = {slot["slot_time"][:10] for slot in slots(client, date_from="2026-11-01")}
    assert min(days) == "2026-11-10"


def test_br07_sau_16h30_khong_hien_ngay_mai(client, world, monkeypatch):
    set_now(monkeypatch, at(NOW.date(), 16, 30))
    days = {slot["slot_time"][:10] for slot in slots(client)}
    assert "2026-11-10" not in days
    assert "2026-11-11" in days


def test_fr18_loc_theo_hinh_thuc(client, world):
    result = slots(client, service_type_id=world.expert.id)
    assert {slot["service_type"] for slot in result} == {"Chuyên gia"}
    assert result[0]["price"] == 300_000
