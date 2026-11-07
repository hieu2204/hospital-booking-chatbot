from app.db import SessionLocal
from app.models import PatientProfile

NEW_USER = {"phone": "0944444444", "password": "matkhau1", "full_name": "Người Mới"}
NEW_PROFILE = {
    "full_name": "Mẹ",
    "dob": "1960-02-03",
    "gender": "Nữ",
    "relation": "Mẹ",
    "id_number": "079060001234",
    "bhyt_code": "DN4797900005678",
    "bhyt_rate": 80,
}


def test_fr01_dang_ky_roi_dang_nhap(client):
    response = client.post("/auth/register", json={**NEW_USER, "otp": "123456"})
    assert response.status_code == 201

    login = client.post(
        "/auth/login", json={"phone": NEW_USER["phone"], "password": NEW_USER["password"]}
    )
    assert login.status_code == 200
    me = client.get(
        "/auth/me", headers={"Authorization": f"Bearer {login.json()['access_token']}"}
    )
    assert me.json()["phone"] == NEW_USER["phone"]


def test_fr01_sai_otp(client):
    assert client.post("/auth/register", json={**NEW_USER, "otp": "000000"}).status_code == 400


def test_fr01_trung_so_dien_thoai(client):
    client.post("/auth/register", json={**NEW_USER, "otp": "123456"})
    assert client.post("/auth/register", json={**NEW_USER, "otp": "123456"}).status_code == 409


def test_fr01_sai_mat_khau(client):
    client.post("/auth/register", json={**NEW_USER, "otp": "123456"})
    response = client.post("/auth/login", json={"phone": NEW_USER["phone"], "password": "sai"})
    assert response.status_code == 401


def test_br11_phai_dang_nhap_moi_dat_duoc(client):
    assert client.post("/appointments", json={}).status_code == 401
    assert client.get("/profiles").status_code == 401


def test_br12_mot_tai_khoan_nhieu_ho_so(client, world):
    client.post("/profiles", json=NEW_PROFILE, headers=world.headers)
    assert len(client.get("/profiles", headers=world.headers).json()) == 3


def test_nfr04_so_cccd_bhyt_ma_hoa_va_che(client, world):
    created = client.post("/profiles", json=NEW_PROFILE, headers=world.headers).json()
    assert created["id_number_masked"] == "****1234"
    assert created["bhyt_code_masked"] == "****5678"
    assert "id_number" not in created

    with SessionLocal() as db:
        stored = db.get(PatientProfile, created["id"])
    assert NEW_PROFILE["id_number"] not in stored.id_number_enc
    assert NEW_PROFILE["bhyt_code"] not in stored.bhyt_code_enc


def test_nfr03_khong_sua_duoc_ho_so_nguoi_khac(client, world):
    response = client.patch(
        f"/profiles/{world.profile.id}", json={"address": "x"}, headers=world.stranger_headers
    )
    assert response.status_code == 404


def test_fr02_sua_ho_so_giu_nguyen_truong_khac(client, world):
    response = client.patch(
        f"/profiles/{world.profile.id}", json={"address": "Quận 5"}, headers=world.headers
    )
    assert response.status_code == 200
    assert response.json()["address"] == "Quận 5"
    assert response.json()["bhyt_code_masked"] == "****5678"
