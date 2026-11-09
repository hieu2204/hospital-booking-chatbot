"""Các API phục vụ giao diện: upload ảnh CCCD, chat có trạng thái, trang quản trị."""

import json

import pytest

from app.config import settings
from app.db import SessionLocal
from app.models import PatientProfile
from tests.conftest import book, book_ok, pay
from tests.test_chat import call, claude, reply, text  # noqa: F401 (fixture)
from tests.test_knowledge import GUIDE

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 100


@pytest.fixture(autouse=True)
def upload_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "upload_dir", str(tmp_path / "uploads"))


def upload(client, world, profile_id, front=("front.png", PNG, "image/png")):
    return client.post(
        f"/profiles/{profile_id}/id-images",
        files={"front": front, "back": ("back.png", PNG, "image/png")},
        headers=world.headers,
    )


def test_br22_trai_tuyen_can_anh_cccd(client, world):
    with SessionLocal() as db:
        db.get(PatientProfile, world.profile.id).id_images_at = None
        db.commit()
    response = book(client, world, payer_type="bhyt_trai_tuyen", bhyt_consent=True)
    assert response.json()["code"] == "ID_IMAGES_REQUIRED"

    assert upload(client, world, world.profile.id).json()["has_id_images"] is True
    assert book(client, world, payer_type="bhyt_trai_tuyen", bhyt_consent=True).status_code == 201


def test_br22_chi_nhan_file_anh(client, world):
    response = upload(client, world, world.profile.id, front=("a.pdf", b"%PDF", "application/pdf"))
    assert response.status_code == 422


def test_br22_khong_upload_vao_ho_so_nguoi_khac(client, world):
    response = client.post(
        f"/profiles/{world.profile.id}/id-images",
        files={"front": ("f.png", PNG, "image/png"), "back": ("b.png", PNG, "image/png")},
        headers=world.stranger_headers,
    )
    assert response.status_code == 404


def test_lich_hen_tra_ve_id_khoa_va_hinh_thuc_de_doi_lich(client, world):
    appointment = book_ok(client, world)
    assert appointment["department_id"] == world.department.id
    assert appointment["service_type_id"] == world.normal.id
    assert appointment["session_id"] == world.wed.id


def events_of(response) -> list[dict]:
    return [json.loads(line[6:]) for line in response.text.splitlines() if line.startswith("data: ")]


def test_chat_stream_gui_trang_thai_roi_cau_tra_loi(client, world, claude):
    claude(reply(call("list_departments"), stop="tool_use"), reply(text("Có 2 khoa.")))
    chat_id = client.post("/chat/sessions").json()["id"]
    response = client.post(f"/chat/sessions/{chat_id}/messages/stream", json={"message": "Có khoa nào?"})

    events = events_of(response)
    statuses = [event["text"] for event in events if event["type"] == "status"]
    assert statuses == ["Đang suy nghĩ...", "Đang xem danh sách chuyên khoa..."]
    assert events[-1]["type"] == "reply"
    assert events[-1]["reply"] == "Có 2 khoa."


def test_chat_stream_loi_api_tra_su_kien_loi(client, world, claude):
    import anthropic
    import httpx2

    claude(anthropic.APIConnectionError(request=httpx2.Request("POST", "https://api.anthropic.com")))
    chat_id = client.post("/chat/sessions").json()["id"]
    events = events_of(client.post(f"/chat/sessions/{chat_id}/messages/stream", json={"message": "Chào"}))
    assert events[-1]["type"] == "error"


def test_uc09_xac_nhan_khong_khan_cap_thi_tiep_tuc(client, world, claude):
    fake = claude(reply(text("Mình gợi ý khoa Hô hấp.")))
    chat_id = client.post("/chat/sessions").json()["id"]
    body = client.post(
        f"/chat/sessions/{chat_id}/messages",
        json={"message": "Tôi hay khó thở khi leo cầu thang", "skip_emergency_check": True},
    ).json()
    assert body["emergency"] is False
    assert len(fake.requests) == 1


def test_admin_xem_ca_va_lich_hen_trong_ngay(client, world):
    appointment = pay(client, world, book_ok(client, world))
    sessions = client.get("/admin/sessions", params={"day": "2026-11-11"}, headers=world.admin_headers).json()
    wed = next(item for item in sessions if item["id"] == world.wed.id)
    assert wed["booked"] == 1
    assert wed["capacity"] == 30

    appointments = client.get("/admin/appointments", params={"day": "2026-11-11"}, headers=world.admin_headers).json()
    assert [item["id"] for item in appointments] == [appointment["id"]]


def test_admin_chi_danh_cho_quan_tri(client, world):
    assert client.get("/admin/sessions", params={"day": "2026-11-11"}, headers=world.headers).status_code == 403
    assert client.get("/admin/usage", headers=world.headers).status_code == 403


def test_fr27_admin_index_lai_kho_tri_thuc(client, world, tmp_path, monkeypatch):
    from app.services import embedding
    from tests.test_knowledge import fake_vector

    monkeypatch.setattr(embedding, "embed_passages", lambda texts: [fake_vector(t) for t in texts])
    folder = tmp_path / "knowledge"
    folder.mkdir()
    (folder / "01-a.md").write_text(GUIDE, encoding="utf-8")
    monkeypatch.setattr(settings, "knowledge_dir", str(folder))

    result = client.post("/admin/knowledge/reindex", headers=world.admin_headers).json()
    assert result == {"files": 1, "changed": 1, "archived": 0}


def test_admin_xem_chi_phi_claude(client, world, claude):
    claude(reply(text("Chào bạn")))
    chat_id = client.post("/chat/sessions").json()["id"]
    client.post(f"/chat/sessions/{chat_id}/messages", json={"message": "Xin chào"})

    usage = client.get("/admin/usage", headers=world.admin_headers).json()
    assert usage["claude-sonnet-5-5"]["turns"] == 1
