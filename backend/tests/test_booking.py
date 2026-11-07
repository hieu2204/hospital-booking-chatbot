from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta

from app.db import SessionLocal
from app.models import AppointmentStatus, BookingChannel
from app.services import booking
from app.services.booking import BookingError, BookingRequest
from tests.conftest import NOW, THURSDAY, add_profile, add_session, add_user, at, book, book_ok, pay, set_now


def code_of(response) -> str:
    return response.json()["code"]


def test_fr05_dat_lich_tao_cho_thanh_toan(client, world):
    appointment = book_ok(client, world)
    assert appointment["status"] == "pending_payment"
    assert appointment["price"] == 150_000
    assert appointment["department"] == "Tiêu hóa"
    assert appointment["hold_expires_at"] is not None


def test_br07_khong_dat_trong_ngay(client, world):
    with SessionLocal() as db:
        today = add_session(db, world, NOW.date())
        db.commit()
    assert code_of(book(client, world, session=today)) == "TOO_LATE"


def test_br07_khong_dat_qua_30_ngay(client, world):
    with SessionLocal() as db:
        far = add_session(db, world, NOW.date() + timedelta(days=31))
        limit = add_session(db, world, NOW.date() + timedelta(days=30))
        db.commit()
    assert code_of(book(client, world, session=far)) == "TOO_FAR"
    assert book(client, world, session=limit).status_code == 201


def test_br07_dat_ngay_mai_truoc_16h30(client, world, monkeypatch):
    set_now(monkeypatch, at(NOW.date(), 16, 29))
    assert book(client, world, session=world.tomorrow).status_code == 201


def test_br07_dat_ngay_mai_sau_16h30_bi_tu_choi(client, world, monkeypatch):
    set_now(monkeypatch, at(NOW.date(), 16, 30))
    assert code_of(book(client, world, session=world.tomorrow)) == "TOO_LATE"


def test_gio_ngoai_ca_bi_tu_choi(client, world):
    assert code_of(book(client, world, hour=13)) == "INVALID_SLOT"
    assert code_of(book(client, world, hour=8, minute=15)) == "INVALID_SLOT"


def test_br06_slot_day_thi_tu_choi(client, world):
    with SessionLocal() as db:
        profiles = [add_profile(db, world.patient) for _ in range(4)]
        db.commit()
    for profile in profiles[:3]:
        book_ok(client, world, profile=profile)
    assert code_of(book(client, world, profile=profiles[3])) == "SLOT_FULL"


def test_nfr02_br15_20_yeu_cau_cung_luc_khong_vuot_suc_chua(world):
    with SessionLocal() as db:
        users = [add_user(db, f"09500000{i:02d}") for i in range(20)]
        pairs = [(user.id, add_profile(db, user).id) for user in users]
        db.commit()

    def attempt(pair):
        user_id, profile_id = pair
        request = BookingRequest(profile_id, world.wed.id, at(world.wed.date, 8))
        with SessionLocal() as db:
            try:
                booking.create_appointment(db, user_id, request, BookingChannel.web)
                return "ok"
            except BookingError as error:
                return error.code

    with ThreadPoolExecutor(max_workers=20) as pool:
        results = list(pool.map(attempt, pairs))

    assert results.count("ok") == 3
    assert results.count("SLOT_FULL") == 17


def test_br14_khong_trung_gio(client, world):
    book_ok(client, world, hour=8)
    assert code_of(book(client, world, hour=8)) == "DUPLICATE_TIME"


def test_br14_toi_da_3_lich_mot_ngay(client, world):
    for hour in (7, 8, 9):
        book_ok(client, world, hour=hour)
    assert code_of(book(client, world, hour=10)) == "DAILY_LIMIT"


def test_br14_lich_da_huy_khong_tinh(client, world):
    first = book_ok(client, world, hour=8)
    client.post(f"/appointments/{first['id']}/cancel", headers=world.headers)
    assert book(client, world, hour=8).status_code == 201


def test_br16_chua_thanh_toan_15_phut_thi_tra_slot(client, world, monkeypatch):
    appointment = book_ok(client, world)
    set_now(monkeypatch, NOW + timedelta(minutes=16))

    response = client.post(f"/appointments/{appointment['id']}/pay", headers=world.headers)
    assert code_of(response) == "HOLD_EXPIRED"
    detail = client.get(f"/appointments/{appointment['id']}", headers=world.headers).json()
    assert detail["status"] == "expired"
    assert book(client, world).status_code == 201


def test_br16_thanh_toan_trong_15_phut(client, world, monkeypatch):
    appointment = book_ok(client, world)
    set_now(monkeypatch, NOW + timedelta(minutes=14))
    paid = pay(client, world, appointment)
    assert paid["status"] == "confirmed"
    assert paid["payment_status"] == "paid"
    assert paid["hold_expires_at"] is None


def test_khong_thanh_toan_hai_lan(client, world):
    appointment = book_ok(client, world)
    pay(client, world, appointment)
    response = client.post(f"/appointments/{appointment['id']}/pay", headers=world.headers)
    assert code_of(response) == "INVALID_STATUS"


def test_br07a_so_thu_tu_theo_thu_tu_thanh_toan(client, world):
    with SessionLocal() as db:
        second = add_profile(db, world.patient)
        db.commit()
    first_booked = book_ok(client, world, hour=8)
    second_booked = book_ok(client, world, hour=8, profile=second)

    assert pay(client, world, second_booked)["queue_no"] == 1
    paid = pay(client, world, first_booked)
    assert paid["queue_no"] == 2
    assert paid["estimated_time"] > paid["slot_time"]


def test_br17_phieu_kham(client, world):
    appointment = book_ok(client, world)
    url = f"/appointments/{appointment['id']}/ticket"
    assert code_of(client.get(url, headers=world.headers)) == "TICKET_NOT_READY"

    pay(client, world, appointment)
    ticket = client.get(url, headers=world.headers).json()
    assert ticket["qr_payload"] == appointment["code"]
    assert ticket["queue_no"] == 1
    assert ticket["room"] == "Phòng 1"
    assert ticket["doctor_name"] == "BS. An"


def test_br25_huong_dan_theo_doi_tuong(client, world):
    service = book_ok(client, world, hour=8)
    insured = book_ok(client, world, hour=9, payer_type="bhyt_dung_tuyen")
    for appointment in (service, insured):
        pay(client, world, appointment)

    def instructions(item):
        url = f"/appointments/{item['id']}/ticket"
        return client.get(url, headers=world.headers).json()["instructions"]

    assert "trước giờ hẹn" in instructions(service)
    assert "quầy 12, 13, 14" in instructions(insured)


def test_br24_hinh_thuc_khong_nhan_bhyt(client, world):
    response = book(client, world, session=world.expert_wed, payer_type="bhyt_dung_tuyen")
    assert code_of(response) == "BHYT_NOT_ALLOWED"


def test_br19_ho_so_chua_co_the_bhyt(client, world):
    response = book(client, world, profile=world.no_bhyt_profile, payer_type="bhyt_dung_tuyen")
    assert code_of(response) == "PROFILE_MISSING_BHYT"


def test_br19_bao_lanh_khong_can_the_bhyt(client, world):
    assert book(client, world, profile=world.no_bhyt_profile, payer_type="bao_lanh").status_code == 201


def test_br22_trai_tuyen_phai_dong_y_cam_ket(client, world):
    response = book(client, world, payer_type="bhyt_trai_tuyen")
    assert code_of(response) == "CONSENT_REQUIRED"
    assert book(client, world, payer_type="bhyt_trai_tuyen", bhyt_consent=True).status_code == 201


def test_br23_khong_tron_dung_tuyen_trai_tuyen_cung_ngay(client, world):
    book_ok(client, world, hour=8, payer_type="bhyt_dung_tuyen")
    response = book(client, world, hour=9, payer_type="bhyt_trai_tuyen", bhyt_consent=True)
    assert code_of(response) == "MIXED_BHYT"
    assert book(client, world, hour=9).status_code == 201


def test_br21_canh_bao_giay_chuyen_tuyen_het_han(client, world):
    response = book(
        client, world, payer_type="bhyt_dung_tuyen", referral_expiry=date(2026, 11, 10).isoformat()
    )
    assert response.status_code == 201
    assert response.json()["warnings"] == ["REFERRAL_EXPIRES_BEFORE_VISIT"]


def test_br21_giay_con_han_khong_canh_bao(client, world):
    response = book(
        client, world, payer_type="bhyt_dung_tuyen", referral_expiry=date(2026, 11, 20).isoformat()
    )
    assert response.json()["warnings"] == []


def test_nfr03_khong_dat_bang_ho_so_nguoi_khac(client, world):
    response = book(client, world, headers=world.stranger_headers)
    assert response.status_code == 404


def test_nfr03_khong_xem_lich_nguoi_khac(client, world):
    appointment = book_ok(client, world)
    url = f"/appointments/{appointment['id']}"
    assert client.get(url, headers=world.stranger_headers).status_code == 404
    assert client.post(f"{url}/cancel", headers=world.stranger_headers).status_code == 404
    assert client.post(f"{url}/pay", headers=world.stranger_headers).status_code == 404


def test_fr12_danh_sach_chi_co_lich_cua_minh(client, world):
    book_ok(client, world)
    assert len(client.get("/appointments", headers=world.headers).json()) == 1
    assert client.get("/appointments", headers=world.stranger_headers).json() == []


def test_br26_huy_truoc_15h_va_hoan_tien(client, world, monkeypatch):
    appointment = pay(client, world, book_ok(client, world))
    set_now(monkeypatch, at(date(2026, 11, 10), 14, 59))

    response = client.post(f"/appointments/{appointment['id']}/cancel", headers=world.headers)
    assert response.json()["status"] == "cancelled"
    assert response.json()["payment_status"] == "refunded"


def test_br26_qua_15h_khong_huy_duoc(client, world, monkeypatch):
    appointment = pay(client, world, book_ok(client, world))
    set_now(monkeypatch, at(date(2026, 11, 10), 15, 0))

    response = client.post(f"/appointments/{appointment['id']}/cancel", headers=world.headers)
    assert code_of(response) == "CANCEL_DEADLINE_PASSED"


def test_br27_huy_lich_chua_thanh_toan_khong_hoan_tien(client, world):
    appointment = book_ok(client, world)
    response = client.post(f"/appointments/{appointment['id']}/cancel", headers=world.headers)
    assert response.json()["status"] == "cancelled"
    assert response.json()["payment_status"] == "pending"


def reschedule(client, world, appointment, session, hour=9):
    return client.post(
        f"/appointments/{appointment['id']}/reschedule",
        json={"session_id": session.id, "slot_time": at(session.date, hour).isoformat()},
        headers=world.headers,
    )


def test_br28_sua_lich_cap_lai_so_thu_tu(client, world):
    appointment = pay(client, world, book_ok(client, world))
    response = reschedule(client, world, appointment, world.thu)

    assert response.status_code == 200
    body = response.json()
    assert body["edit_count"] == 1
    assert body["queue_no"] == 1
    assert body["slot_time"].startswith("2026-11-12")


def test_br28_chi_sua_mot_lan(client, world):
    appointment = pay(client, world, book_ok(client, world))
    reschedule(client, world, appointment, world.thu)
    assert code_of(reschedule(client, world, appointment, world.wed)) == "EDIT_LIMIT"


def test_br28_qua_16h30_khong_sua_duoc(client, world, monkeypatch):
    appointment = pay(client, world, book_ok(client, world))
    set_now(monkeypatch, at(date(2026, 11, 10), 16, 30))
    assert code_of(reschedule(client, world, appointment, world.thu)) == "EDIT_DEADLINE_PASSED"


def test_br28_khong_doi_sang_hinh_thuc_khac(client, world):
    appointment = pay(client, world, book_ok(client, world))
    assert code_of(reschedule(client, world, appointment, world.expert_wed)) == "INVALID_SLOT"


def test_br28_lich_chua_thanh_toan_khong_sua_duoc(client, world):
    appointment = book_ok(client, world)
    assert code_of(reschedule(client, world, appointment, world.thu)) == "INVALID_STATUS"


def test_br28_slot_moi_het_cho(client, world):
    with SessionLocal() as db:
        full = add_session(db, world, THURSDAY + timedelta(days=1), capacity=1)
        other = add_profile(db, world.patient)
        db.commit()
    book_ok(client, world, session=full, hour=9, profile=other)
    appointment = pay(client, world, book_ok(client, world))
    assert code_of(reschedule(client, world, appointment, full)) == "SLOT_FULL"


def admin_lock(client, world, session, **body):
    return client.post(
        f"/admin/sessions/{session.id}/lock", json=body, headers=world.admin_headers
    )


def test_quyen_admin(client, world):
    response = client.post(
        f"/admin/sessions/{world.wed.id}/lock", json={}, headers=world.headers
    )
    assert response.status_code == 403


def test_br09_kham_thay_giu_nguyen_lich(client, world):
    appointment = pay(client, world, book_ok(client, world))
    admin_lock(client, world, world.wed, substitute_doctor_id=world.substitute.id)

    detail = client.get(f"/appointments/{appointment['id']}", headers=world.headers).json()
    assert detail["status"] == "confirmed"
    assert detail["doctor_name"] == "BS. Bình"


def test_br09_bac_si_kham_thay_phai_cung_khoa(client, world):
    response = admin_lock(client, world, world.wed, substitute_doctor_id=world.other_doctor.id)
    assert code_of(response) == "INVALID_SUBSTITUTE"


def test_br10_khoa_ca_chuyen_lich_sang_cho_doi(client, world):
    appointment = pay(client, world, book_ok(client, world))
    assert admin_lock(client, world, world.wed).status_code == 200

    detail = client.get(f"/appointments/{appointment['id']}", headers=world.headers).json()
    assert detail["status"] == "need_reschedule"
    assert code_of(book(client, world, hour=9)) == "SESSION_LOCKED"


def test_br10_lich_cho_doi_duoc_doi_khong_tinh_gioi_han(client, world):
    appointment = pay(client, world, book_ok(client, world))
    admin_lock(client, world, world.wed)

    body = reschedule(client, world, appointment, world.thu).json()
    assert body["status"] == "confirmed"
    assert body["edit_count"] == 0


def test_br10_lich_cho_doi_duoc_huy_va_hoan_tien(client, world, monkeypatch):
    appointment = pay(client, world, book_ok(client, world))
    admin_lock(client, world, world.wed)
    set_now(monkeypatch, at(date(2026, 11, 10), 15, 30))

    response = client.post(f"/appointments/{appointment['id']}/cancel", headers=world.headers)
    assert response.json()["payment_status"] == "refunded"


def test_br28a_sau_16h30_phai_co_bac_si_kham_thay(client, world, monkeypatch):
    pay(client, world, book_ok(client, world))
    set_now(monkeypatch, at(date(2026, 11, 10), 16, 30))

    assert code_of(admin_lock(client, world, world.wed)) == "SUBSTITUTE_REQUIRED"
    response = admin_lock(client, world, world.wed, substitute_doctor_id=world.substitute.id)
    assert response.status_code == 200


def test_admin_hoan_tat_lich(client, world):
    appointment = pay(client, world, book_ok(client, world))
    response = client.post(
        f"/admin/appointments/{appointment['id']}/complete", headers=world.admin_headers
    )
    assert response.json()["status"] == AppointmentStatus.completed.value
