"""Test chatbot bằng Claude giả: phản hồi viết sẵn theo kịch bản, không gọi API, không tốn tiền."""

import copy

import anthropic
import httpx2
import pytest
from anthropic.types import Message, TextBlock, ToolUseBlock, Usage
from sqlalchemy import func, select

from app.db import SessionLocal
from app.models import ChatMessage
from app.services import agent, embedding
from tests.conftest import at, set_now
from tests.test_knowledge import FAQ, fake_vector, index


def reply(*blocks, stop="end_turn") -> Message:
    return Message.model_construct(
        id="msg_test",
        type="message",
        role="assistant",
        model="claude-sonnet-5-5",
        content=list(blocks),
        stop_reason=stop,
        usage=Usage.model_construct(
            input_tokens=1000, output_tokens=100, cache_read_input_tokens=0, cache_creation_input_tokens=0
        ),
    )


def text(value: str) -> TextBlock:
    return TextBlock(type="text", text=value)


def call(name: str, tool_id: str = "toolu_1", **arguments) -> ToolUseBlock:
    return ToolUseBlock(type="tool_use", id=tool_id, name=name, input=arguments)


class FakeClaude:
    """Trả lần lượt các phản hồi viết sẵn và ghi lại mọi request."""

    def __init__(self, *responses):
        self.responses = list(responses)
        self.requests: list[dict] = []

    def __call__(self, **kwargs):
        self.requests.append(copy.deepcopy(kwargs))
        if not self.responses:
            raise AssertionError("Claude giả hết kịch bản")
        response = self.responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response

    def tool_results(self, index: int) -> list[dict]:
        return self.requests[index]["messages"][-1]["content"]


@pytest.fixture
def claude(monkeypatch):
    def install(*responses) -> FakeClaude:
        fake = FakeClaude(*responses)
        monkeypatch.setattr(agent, "call_model", fake)
        return fake

    return install


@pytest.fixture(autouse=True)
def fake_embedding(monkeypatch):
    monkeypatch.setattr(embedding, "embed_query", fake_vector)
    monkeypatch.setattr(embedding, "embed_passages", lambda texts: [fake_vector(t) for t in texts])


def new_chat(client, headers=None) -> str:
    return client.post("/chat/sessions", headers=headers or {}).json()["id"]


def send(client, chat_id, message, headers=None):
    return client.post(f"/chat/sessions/{chat_id}/messages", json={"message": message}, headers=headers or {})


def stored_rows() -> int:
    with SessionLocal() as db:
        return db.scalar(select(func.count()).select_from(ChatMessage))


def test_uc09_cap_cuu_tra_loi_ngay_khong_goi_claude(client, world, claude):
    fake = claude()
    chat_id = new_chat(client)
    body = send(client, chat_id, "Bố tôi đau ngực dữ dội, vã mồ hôi").json()

    assert body["emergency"] is True
    assert "115" in body["reply"]
    assert body["cards"][0]["type"] == "emergency"
    assert fake.requests == []


def test_uc05_hoi_thu_tuc_qua_search_docs_va_tra_nguon(client, world, claude, tmp_path):
    (tmp_path / "14-faq.md").write_text(FAQ, encoding="utf-8")
    index(tmp_path)
    fake = claude(
        reply(call("search_docs", query="Chủ nhật có khám không"), stop="tool_use"),
        reply(text("Chủ nhật bệnh viện không khám ngoại trú.")),
    )
    chat_id = new_chat(client)
    body = send(client, chat_id, "Chủ nhật có khám không?").json()

    assert body["reply"] == "Chủ nhật bệnh viện không khám ngoại trú."
    assert body["sources"][0]["title"] == "Câu hỏi thường gặp"
    assert "Không khám ngoại trú" in fake.tool_results(1)[0]["content"]


def test_fr22_luot_sau_phat_lai_nguyen_van_lich_su(client, world, claude):
    fake = claude(
        reply(call("list_departments"), stop="tool_use"),
        reply(text("Bệnh viện có khoa Tiêu hóa và Mắt.")),
        reply(text("Bạn muốn khám khoa nào?")),
    )
    chat_id = new_chat(client)
    send(client, chat_id, "Có những khoa nào?")
    send(client, chat_id, "Cảm ơn")

    first_turn = fake.requests[1]["messages"] + [
        {"role": "assistant", "content": [{"type": "text", "text": "Bệnh viện có khoa Tiêu hóa và Mắt."}]}
    ]
    second_turn = fake.requests[2]["messages"]
    # Append-only: lượt sau bắt đầu bằng đúng lịch sử lượt trước
    assert second_turn[: len(first_turn)] == first_turn
    assert second_turn[-1]["content"][0]["text"].endswith("Cảm ơn")


def test_lich_su_hien_cho_giao_dien(client, world, claude):
    claude(reply(text("Chào bạn!")))
    chat_id = new_chat(client)
    send(client, chat_id, "Xin chào")

    history = client.get(f"/chat/sessions/{chat_id}/messages").json()
    assert [(item["role"], item["content"]) for item in history] == [
        ("user", "Xin chào"),
        ("assistant", "Chào bạn!"),
    ]


def test_moi_tin_nhan_kem_ngay_gio_va_trang_thai_dang_nhap(client, world, claude, monkeypatch):
    set_now(monkeypatch, at(world.wed.date, 9, 30))
    fake = claude(reply(text("Ok")))
    send(client, new_chat(client), "Mai có khám không?")

    first = fake.requests[0]["messages"][-1]["content"][0]["text"]
    assert first.startswith("[Bối cảnh: hôm nay là thứ Tư 11/11/2026, 09:30. Người dùng chưa đăng nhập.]")


def test_br33_che_so_cccd_truoc_khi_gui_claude_va_luu(client, world, claude):
    fake = claude(reply(text("Bạn cập nhật CCCD ở trang Hồ sơ nhé.")))
    chat_id = new_chat(client)
    send(client, chat_id, "CCCD của tôi là 079090001234, thẻ DN4797912345678")

    sent = fake.requests[0]["messages"][-1]["content"][0]["text"]
    assert "079090001234" not in sent and "****1234" in sent
    assert "DN4797912345678" not in sent and "****5678" in sent
    history = client.get(f"/chat/sessions/{chat_id}/messages").json()
    assert "079090001234" not in history[0]["content"]


def test_a2_khach_goi_tool_can_dang_nhap(client, world, claude):
    fake = claude(
        reply(call("get_profiles"), stop="tool_use"),
        reply(text("Bạn cần đăng nhập trước.")),
    )
    send(client, new_chat(client), "Đặt lịch cho tôi")

    result = fake.tool_results(1)[0]
    assert result["is_error"] is True
    assert "LOGIN_REQUIRED" in result["content"]


def test_a2_dang_nhap_giua_chung_giu_ngu_canh(client, world, claude):
    fake = claude(reply(text("Bạn cần đăng nhập.")), reply(call("get_profiles"), stop="tool_use"), reply(text("Ok")))
    chat_id = new_chat(client)
    send(client, chat_id, "Đặt lịch cho tôi")
    send(client, chat_id, "Tôi đăng nhập rồi", headers=world.headers)

    assert "Hồ Sơ Thử" in fake.tool_results(2)[0]["content"]
    assert len(fake.requests[1]["messages"]) == 3


def test_fr19_dat_lich_qua_chat_tao_the_xac_nhan(client, world, claude):
    slot_time = at(world.wed.date, 8).isoformat()
    claude(
        reply(
            call(
                "prepare_booking",
                profile_id=world.profile.id,
                session_id=world.wed.id,
                slot_time=slot_time,
                payer_type="none",
                referral_expiry=None,
                symptoms="đau dạ dày",
                bhyt_consent=False,
            ),
            stop="tool_use",
        ),
        reply(text("Bạn kiểm tra thẻ và bấm Xác nhận nhé.")),
    )
    chat_id = new_chat(client, world.headers)
    body = send(client, chat_id, "Đặt giúp tôi 8h thứ Tư", world.headers).json()

    card = body["cards"][0]
    assert card["type"] == "booking_draft"
    assert card["draft"]["department"] == "Tiêu hóa"
    # BR-32: chatbot chưa tạo lịch, chỉ khi bấm Xác nhận mới có lịch
    assert client.get("/appointments", headers=world.headers).json() == []
    confirmed = client.post(f"/booking-drafts/{card['draft']['id']}/confirm", headers=world.headers)
    assert confirmed.json()["appointment"]["status"] == "pending_payment"


def test_e2_loi_nghiep_vu_tra_ma_cho_bot_giai_thich(client, world, claude):
    fake = claude(
        reply(
            call(
                "prepare_booking",
                profile_id=world.profile.id,
                session_id=world.expert_wed.id,
                slot_time=at(world.wed.date, 8).isoformat(),
                payer_type="bhyt_dung_tuyen",
                referral_expiry=None,
                symptoms=None,
                bhyt_consent=False,
            ),
            stop="tool_use",
        ),
        reply(text("Phòng khám Chuyên gia không nhận BHYT.")),
    )
    chat_id = new_chat(client, world.headers)
    body = send(client, chat_id, "Đặt khám chuyên gia dùng BHYT", world.headers).json()

    assert body["cards"] == []
    assert "BHYT_NOT_ALLOWED" in fake.tool_results(1)[0]["content"]


def test_uc08_de_xuat_huy_hien_the(client, world, claude):
    from tests.conftest import book_ok, pay

    appointment = pay(client, world, book_ok(client, world))
    claude(reply(call("propose_cancel", appointment_id=appointment["id"]), stop="tool_use"), reply(text("Bạn bấm xác nhận hủy nhé.")))
    body = send(client, new_chat(client, world.headers), "Hủy lịch giúp tôi", world.headers).json()

    assert body["cards"][0]["type"] == "cancel_confirm"
    detail = client.get(f"/appointments/{appointment['id']}", headers=world.headers).json()
    assert detail["status"] == "confirmed"


def test_uc08_qua_han_huy_thi_bao_ma_loi(client, world, claude, monkeypatch):
    from tests.conftest import book_ok, pay

    appointment = pay(client, world, book_ok(client, world))
    set_now(monkeypatch, at(world.tomorrow.date, 15, 30))
    fake = claude(reply(call("propose_cancel", appointment_id=appointment["id"]), stop="tool_use"), reply(text("Đã quá hạn.")))
    send(client, new_chat(client, world.headers), "Hủy lịch", world.headers)
    assert "CANCEL_DEADLINE_PASSED" in fake.tool_results(1)[0]["content"]


def test_tool_khong_ton_tai(client, world, claude):
    fake = claude(reply(call("delete_everything"), stop="tool_use"), reply(text("Xin lỗi.")))
    send(client, new_chat(client), "Xóa dữ liệu")
    assert "UNKNOWN_TOOL" in fake.tool_results(1)[0]["content"]


def test_tu_choi_an_toan_tra_cau_co_dinh(client, world, claude):
    claude(reply(stop="refusal"))
    body = send(client, new_chat(client), "...").json()
    assert body["reply"].startswith("Xin lỗi, mình không hỗ trợ được yêu cầu này")


def test_gioi_han_so_buoc(client, world, claude, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "chat_max_steps", 2)
    claude(*[reply(call("list_departments", tool_id=f"toolu_{i}"), stop="tool_use") for i in range(2)])
    body = send(client, new_chat(client), "Có những khoa nào?").json()
    assert "nhiều bước hơn dự kiến" in body["reply"]


def test_e6_loi_api_tra_503_va_khong_luu_lich_su_do_dang(client, world, claude):
    error = anthropic.APIConnectionError(request=httpx2.Request("POST", "https://api.anthropic.com"))
    claude(reply(call("list_departments"), stop="tool_use"), error)
    chat_id = new_chat(client)
    response = send(client, chat_id, "Có những khoa nào?")

    assert response.status_code == 503
    assert "trang Đặt lịch" in response.json()["detail"]
    assert stored_rows() == 0


def test_nfr03_khong_doc_phien_chat_nguoi_khac(client, world, claude):
    claude(reply(text("Chào bạn")))
    chat_id = new_chat(client, world.headers)
    send(client, chat_id, "Xin chào", world.headers)

    assert client.get(f"/chat/sessions/{chat_id}/messages").status_code == 404
    assert client.get(f"/chat/sessions/{chat_id}/messages", headers=world.stranger_headers).status_code == 404


def test_nfr10_luu_lan_goi_tool_va_chi_phi(client, world, claude):
    claude(reply(call("list_departments"), stop="tool_use"), reply(text("Có 2 khoa.")))
    send(client, new_chat(client), "Có những khoa nào?")

    with SessionLocal() as db:
        rows = db.scalars(select(ChatMessage).order_by(ChatMessage.id)).all()
    calls = [call for row in rows for call in (row.tool_calls or [])]
    assert calls[0]["name"] == "list_departments"
    usage = rows[-1].meta["usage"]
    assert usage["input"] == 2000 and usage["output"] == 200
    assert usage["cost_usd"] == pytest.approx((2000 * 2 + 200 * 10) / 1_000_000)
