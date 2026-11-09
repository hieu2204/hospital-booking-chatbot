from datetime import timedelta

import pytest

from app.db import SessionLocal
from app.models import BookingChannel, ChatSession, DraftStatus
from app.services import booking
from app.services.booking import BookingError, BookingRequest
from tests.conftest import NOW, add_profile, at, book_ok, set_now


@pytest.fixture
def chat(world):
    with SessionLocal() as db:
        session = ChatSession(user_id=world.patient.id)
        stranger_session = ChatSession(user_id=world.stranger.id)
        db.add_all([session, stranger_session])
        db.commit()
        return session.id, stranger_session.id


def request(world, hour=8, **extra) -> BookingRequest:
    return BookingRequest(world.profile.id, world.wed.id, at(world.wed.date, hour), **extra)


def prepare(world, chat_id, **kwargs):
    with SessionLocal() as db:
        draft, warnings = booking.prepare_booking(db, world.patient.id, chat_id, request(world, **kwargs))
        return draft.id, warnings


def confirm(client, world, draft_id, headers=None):
    return client.post(f"/booking-drafts/{draft_id}/confirm", headers=headers or world.headers)


def remaining_at_eight(client, world) -> int:
    slots = client.get(
        "/slots", params={"doctor_id": world.doctor.id, "date_from": "2026-11-11", "date_to": "2026-11-11"}
    ).json()
    return next(slot for slot in slots if "T08:00" in slot["slot_time"])["remaining"]


def test_br32_ban_nhap_chua_giu_cho(client, world, chat):
    prepare(world, chat[0])
    assert remaining_at_eight(client, world) == 3


def test_br32_ban_nhap_hien_the_tom_tat(client, world, chat):
    draft_id, _ = prepare(world, chat[0])
    card = client.get(f"/booking-drafts/{draft_id}", headers=world.headers).json()
    assert card["status"] == "open"
    assert card["department"] == "Tiêu hóa"
    assert card["price"] == 150_000


def test_br32_ban_nhap_kiem_tra_quy_tac_truoc(world, chat):
    with pytest.raises(BookingError) as error:
        prepare(world, chat[0], payer_type="bhyt_trai_tuyen")
    assert error.value.code == "CONSENT_REQUIRED"


def test_br32_ban_nhap_tra_canh_bao(world, chat):
    from datetime import date

    _, warnings = prepare(world, chat[0], payer_type="bhyt_dung_tuyen", referral_expiry=date(2026, 11, 10))
    assert warnings == ["REFERRAL_EXPIRES_BEFORE_VISIT"]


def test_br32_khong_dung_phien_chat_nguoi_khac(world, chat):
    with pytest.raises(BookingError) as error:
        prepare(world, chat[1])
    assert error.value.code == "NOT_FOUND"


def test_fr19_xac_nhan_tao_lich_kenh_chatbot(client, world, chat):
    draft_id, _ = prepare(world, chat[0])
    response = confirm(client, world, draft_id)

    assert response.status_code == 200
    appointment = response.json()["appointment"]
    assert appointment["status"] == "pending_payment"
    assert remaining_at_eight(client, world) == 2
    with SessionLocal() as db:
        from app.models import Appointment

        assert db.get(Appointment, appointment["id"]).channel == BookingChannel.chatbot


def test_e4_bam_xac_nhan_hai_lan(client, world, chat):
    draft_id, _ = prepare(world, chat[0])
    confirm(client, world, draft_id)
    response = confirm(client, world, draft_id)
    assert response.json()["code"] == "DRAFT_USED"
    assert remaining_at_eight(client, world) == 2


def test_e4_ban_nhap_het_han(client, world, chat, monkeypatch):
    draft_id, _ = prepare(world, chat[0])
    set_now(monkeypatch, NOW + timedelta(minutes=15))
    assert confirm(client, world, draft_id).json()["code"] == "DRAFT_EXPIRED"


def test_e3_slot_vua_het_thi_bao_va_bo_ban_nhap(client, world, chat):
    draft_id, _ = prepare(world, chat[0])
    with SessionLocal() as db:
        others = [add_profile(db, world.patient) for _ in range(3)]
        db.commit()
    for profile in others:
        book_ok(client, world, hour=8, profile=profile)

    assert confirm(client, world, draft_id).json()["code"] == "SLOT_FULL"
    with SessionLocal() as db:
        assert booking.owned_draft(db, world.patient.id, draft_id).status == DraftStatus.discarded


def test_a8_bam_sua_bo_ban_nhap(client, world, chat):
    draft_id, _ = prepare(world, chat[0])
    response = client.post(f"/booking-drafts/{draft_id}/discard", headers=world.headers)
    assert response.status_code == 204
    assert confirm(client, world, draft_id).json()["code"] == "DRAFT_USED"


def test_nfr03_khong_xac_nhan_ban_nhap_nguoi_khac(client, world, chat):
    draft_id, _ = prepare(world, chat[0])
    assert confirm(client, world, draft_id, headers=world.stranger_headers).status_code == 404
    assert client.get(f"/booking-drafts/{draft_id}", headers=world.stranger_headers).status_code == 404
