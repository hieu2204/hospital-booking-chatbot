import pytest

from app.seed import DEPARTMENTS
from app.services.safety import check_message
from app.services.text import normalize_vi
from app.services.triage import load_map, match_symptoms


def test_bo_dau_tieng_viet():
    assert normalize_vi("Khó THỞ, đau ngực!!") == "kho tho dau nguc"
    assert normalize_vi("Đột quỵ") == "dot quy"


@pytest.mark.parametrize(
    "message, category",
    [
        ("Bố tôi đau ngực dữ dội, vã mồ hôi", "dau_nguc"),
        ("mẹ tôi đang khó thở lắm", "kho_tho"),
        ("bi kho tho tu sang", "kho_tho"),
        ("ông tôi bị méo miệng, yếu nửa người", "dot_quy"),
        ("con tôi sốt cao rồi co giật", "co_giat"),
        ("bà tôi ngất xỉu ở nhà", "bat_tinh"),
        ("vừa nôn ra máu", "chay_mau"),
        ("cháu uống nhầm thuốc của bà", "ngo_doc"),
        ("tôi không muốn sống nữa", "tu_hai"),
    ],
)
def test_br30_phat_hien_dau_hieu_cap_cuu(message, category):
    result = check_message(message)
    assert result.is_emergency
    assert result.category == category
    assert "115" in result.message


@pytest.mark.parametrize(
    "message",
    [
        "Tôi muốn đặt lịch khám tim mạch sáng thứ 7",
        "đau đầu nhẹ hai hôm nay",
        "tôi bị đau ngực nhẹ khi trời lạnh",
        "Không khó thở, chỉ ho khan",
        "con tôi hết co giật từ năm ngoái rồi, giờ tái khám",
        "Bệnh viện mở cửa mấy giờ?",
    ],
)
def test_br30_cau_binh_thuong_khong_bao_dong(message):
    assert not check_message(message).is_emergency


def test_br30_tu_hai_dung_cau_rieng():
    assert "không phải đối mặt chuyện này một mình" in check_message("tôi muốn tự tử").message


def test_uc06_ten_khoa_khop_du_lieu_mau():
    seeded = {name for name, _ in DEPARTMENTS}
    data = load_map()
    assert set(data["departments"]) <= seeded
    assert data["fallback"] in seeded


@pytest.mark.parametrize(
    "symptoms, department",
    [
        ("tôi hay bị ợ chua, đau thượng vị", "Tiêu hóa"),
        ("ho kéo dài 3 tuần", "Hô hấp"),
        ("đường huyết cao, khát nước nhiều", "Nội tiết"),
        ("tiểu buốt và tiểu rắt", "Tiết niệu"),
        ("nhuc rang qua", "Phẫu thuật Hàm mặt - Răng hàm mặt"),
        ("đau gối khi leo cầu thang", "Nội Cơ xương khớp"),
        ("kinh nguyệt không đều", "Phụ sản"),
    ],
)
def test_uc06_goi_y_dung_khoa(symptoms, department):
    assert department in match_symptoms(symptoms)


def test_uc06_cum_dai_duoc_uu_tien():
    found = match_symptoms("dạo này bị ngứa mắt")
    assert "Mắt" in found
    assert "Da liễu - Thẩm mỹ da" not in found


def test_uc06_goi_y_toi_da_hai_khoa_va_kem_luu_y(client, world):
    from app.db import SessionLocal
    from app.models import Department

    with SessionLocal() as db:
        db.add_all(
            Department(facility_id=world.department.facility_id, name=name)
            for name in ("Hô hấp", "Nội Tim mạch", "Tai Mũi Họng")
        )
        db.commit()
    body = client.get(
        "/triage/suggest-department", params={"symptoms": "đau ngực, ho có đờm và đau họng"}
    ).json()
    assert len(body["suggestions"]) == 2
    assert all(item["department_id"] for item in body["suggestions"])
    assert "không thay thế chẩn đoán" in body["disclaimer"]


def test_uc06_khong_ro_trieu_chung_thi_ve_khoa_kham_benh(client, world):
    body = client.get("/triage/suggest-department", params={"symptoms": "tôi thấy mệt"}).json()
    assert body["suggestions"][0]["department"] == "Khám bệnh"


def test_uc09_api_kiem_tra_cap_cuu(client):
    body = client.post("/triage/emergency-check", json={"message": "bố tôi bất tỉnh"}).json()
    assert body["is_emergency"] is True
    assert body["category"] == "bat_tinh"
