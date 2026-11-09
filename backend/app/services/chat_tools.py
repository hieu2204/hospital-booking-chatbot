"""Tool của chatbot (mục 6 SRS). Mọi tool chạy với quyền của người đang đăng nhập.

Tool chỉ đọc dữ liệu hoặc tạo bản nháp. Việc đặt, hủy, đổi lịch thật đi qua thẻ xác nhận
trên giao diện, không qua LLM (BR-32).
"""

import json
from dataclasses import dataclass, field
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import clock
from app.config import settings
from app.models import (
    Appointment,
    AppointmentStatus,
    ClinicSession,
    Department,
    PatientProfile,
    PayerType,
    ServicePrice,
    ServiceType,
)
from app.routers.catalog import list_doctors
from app.services import booking, knowledge, triage
from app.services.booking import BookingError, BookingRequest

WEEKDAYS = ["thứ Hai", "thứ Ba", "thứ Tư", "thứ Năm", "thứ Sáu", "thứ Bảy", "Chủ nhật"]
MAX_SLOTS = 20


def nullable(schema: dict) -> dict:
    return {**schema, "type": [schema["type"], "null"]}


def tool(name: str, description: str, properties: dict | None = None) -> dict:
    properties = properties or {}
    return {
        "name": name,
        "description": description,
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": properties,
            "required": list(properties),
            "additionalProperties": False,
        },
    }


DATE = {"type": "string", "description": "Ngày dạng YYYY-MM-DD"}

TOOLS = [
    tool(
        "search_docs",
        "Tìm trong tài liệu hướng dẫn của bệnh viện: thủ tục, BHYT, giờ làm việc, thanh toán, "
        "hủy lịch, hoàn tiền, nội trú. Dùng trước khi trả lời mọi câu hỏi về quy định, kể cả khi "
        "bạn nghĩ mình đã biết. Viết câu truy vấn bằng tiếng Việt có dấu.",
        {"query": {"type": "string"}},
    ),
    tool(
        "list_departments",
        "Danh sách chuyên khoa (kèm id) và các hình thức khám, giá khám, có nhận BHYT hay không.",
    ),
    tool(
        "suggest_department",
        "Gợi ý 1-2 chuyên khoa từ triệu chứng người bệnh mô tả. Không phải chẩn đoán.",
        {"symptoms": {"type": "string"}},
    ),
    tool(
        "get_doctors",
        "Danh sách bác sĩ của một khoa và lịch khám theo buổi trong tuần.",
        {"department_id": {"type": "integer"}},
    ),
    tool(
        "get_available_slots",
        "Khung giờ còn trống, tối đa 20 kết quả sớm nhất. Lọc theo khoa, bác sĩ, hình thức khám "
        "và khoảng ngày; trường nào không cần thì truyền null.",
        {
            "department_id": nullable({"type": "integer"}),
            "doctor_id": nullable({"type": "integer"}),
            "service_type_id": nullable({"type": "integer"}),
            "date_from": nullable(DATE),
            "date_to": nullable(DATE),
        },
    ),
    tool(
        "get_profiles",
        "Các hồ sơ người bệnh trong tài khoản (bản thân, người thân). Cần đăng nhập.",
    ),
    tool(
        "prepare_booking",
        "Tạo bản nháp lịch hẹn và hiện thẻ tóm tắt để người bệnh bấm Xác nhận. Chưa giữ chỗ, chưa "
        "đặt lịch. Hệ thống kiểm tra mọi quy định và trả mã lỗi nếu vi phạm. Cần đăng nhập.",
        {
            "profile_id": {"type": "integer"},
            "session_id": {"type": "integer"},
            "slot_time": {"type": "string", "description": "Giữ nguyên slot_time từ get_available_slots"},
            "payer_type": {
                "type": "string",
                "enum": [payer.value for payer in PayerType],
                "description": "none: dịch vụ; bhyt_dung_tuyen; bhyt_trai_tuyen; bao_lanh: bảo hiểm tư nhân",
            },
            "referral_expiry": nullable({**DATE, "description": "Hạn giấy chuyển tuyến, nếu có"}),
            "symptoms": nullable({"type": "string"}),
            "bhyt_consent": {
                "type": "boolean",
                "description": "Người bệnh đã đồng ý cam kết khám trái tuyến",
            },
        },
    ),
    tool(
        "list_my_appointments",
        "Lịch hẹn còn hiệu lực của tài khoản, dùng trước khi hủy hoặc đổi lịch. Cần đăng nhập.",
    ),
    tool(
        "propose_cancel",
        "Kiểm tra lịch hẹn có hủy được không và hiện thẻ để người bệnh bấm xác nhận hủy. Cần đăng nhập.",
        {"appointment_id": {"type": "integer"}},
    ),
    tool(
        "propose_reschedule",
        "Kiểm tra có đổi lịch được không và hiện thẻ để người bệnh bấm xác nhận đổi. Cần đăng nhập.",
        {
            "appointment_id": {"type": "integer"},
            "session_id": {"type": "integer"},
            "slot_time": {"type": "string"},
        },
    ),
]


@dataclass
class ToolContext:
    db: Session
    user_id: int | None
    chat_session_id: object
    cards: list[dict] = field(default_factory=list)
    sources: list[dict] = field(default_factory=list)


def add_card(ctx: ToolContext, card: dict) -> None:
    """Thẻ được lưu vào JSONB và trả cho giao diện, nên đổi ngày giờ, UUID sang chuỗi."""
    ctx.cards.append(json.loads(to_json(card)))


def require_login(ctx: ToolContext) -> int:
    if ctx.user_id is None:
        raise BookingError("LOGIN_REQUIRED", "Người dùng cần đăng nhập để dùng chức năng này", 401)
    return ctx.user_id


def parse_slot(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=settings.tz)


def parse_date(value: str | None) -> date | None:
    return date.fromisoformat(value) if value else None


def local_label(moment: datetime) -> str:
    local = moment.astimezone(settings.tz)
    return f"{WEEKDAYS[local.weekday()]} {local:%d/%m/%Y %H:%M}"


def search_docs(ctx: ToolContext, query: str) -> list[dict]:
    hits = knowledge.search_docs(ctx.db, query)
    for hit in hits:
        source = {"title": hit["title"], "url": hit["source_url"]}
        if source not in ctx.sources:
            ctx.sources.append(source)
    return [{"title": hit["title"], "text": hit["text"]} for hit in hits]


def list_departments(ctx: ToolContext) -> dict:
    prices: dict[int, set[int]] = {}
    for price in ctx.db.scalars(select(ServicePrice)):
        prices.setdefault(price.service_type_id, set()).add(price.amount)
    return {
        "departments": [
            {"id": d.id, "name": d.name, "description": d.description}
            for d in ctx.db.scalars(select(Department).order_by(Department.id))
        ],
        "service_types": [
            {
                "id": s.id,
                "name": s.name,
                "allow_bhyt": s.allow_bhyt,
                "choose_doctor": s.choose_doctor,
                "price_vnd": sorted(prices.get(s.id, [])),
            }
            for s in ctx.db.scalars(select(ServiceType).order_by(ServiceType.id))
        ],
    }


def suggest_department(ctx: ToolContext, symptoms: str) -> dict:
    result = triage.suggest_departments(ctx.db, symptoms)
    if any(item["matched"] for item in result["suggestions"]):
        return result
    # BR-29a: bảng không khớp cụm nào thì đưa danh sách khoa để bot tự chọn theo mô tả,
    # khoa Khám bệnh chỉ là phương án cuối chứ không phải đáp án mặc định
    departments = ctx.db.execute(select(Department.id, Department.name, Department.description)).all()
    return {
        "no_match": True,
        "note": (
            "Bảng triệu chứng không khớp cụm nào. Hãy tự chọn 1-2 khoa phù hợp nhất theo mô tả "
            "dưới đây. Chỉ chọn Khám bệnh khi mô tả chung chung, không chỉ ra được cơ quan nào."
        ),
        "departments": [{"department_id": i, "department": n, "description": d} for i, n, d in departments],
        "disclaimer": result["disclaimer"],
    }


def get_doctors(ctx: ToolContext, department_id: int) -> list[dict]:
    doctors = list_doctors(department_id, ctx.db)
    return [
        {
            "id": doctor.id,
            "name": f"{doctor.title} {doctor.full_name}",
            "schedule": [
                f"{'Sáng' if item.shift == 'morning' else 'Chiều'} {WEEKDAYS[item.weekday]}: "
                f"{item.service_type}, {item.room}"
                for item in doctor.schedule
            ],
        }
        for doctor in doctors
    ]


def get_available_slots(
    ctx: ToolContext,
    department_id: int | None,
    doctor_id: int | None,
    service_type_id: int | None,
    date_from: str | None,
    date_to: str | None,
) -> dict:
    slots = booking.available_slots(
        ctx.db, department_id, doctor_id, service_type_id, parse_date(date_from), parse_date(date_to)
    )
    return {
        "total_found": len(slots),
        "slots": [
            {**slot, "slot_time": slot["slot_time"].isoformat(), "label": local_label(slot["slot_time"])}
            for slot in slots[:MAX_SLOTS]
        ],
    }


def get_profiles(ctx: ToolContext) -> list[dict]:
    user_id = require_login(ctx)
    profiles = ctx.db.scalars(select(PatientProfile).where(PatientProfile.user_id == user_id))
    return [
        {
            "id": p.id,
            "full_name": p.full_name,
            "relation": p.relation,
            "dob": p.dob.isoformat(),
            "has_bhyt": p.bhyt_code_enc is not None,
            "bhyt_rate": p.bhyt_rate,
        }
        for p in profiles
    ]


def prepare_booking(
    ctx: ToolContext,
    profile_id: int,
    session_id: int,
    slot_time: str,
    payer_type: str,
    referral_expiry: str | None,
    symptoms: str | None,
    bhyt_consent: bool,
) -> dict:
    user_id = require_login(ctx)
    request = BookingRequest(
        profile_id=profile_id,
        session_id=session_id,
        slot_time=parse_slot(slot_time),
        payer_type=PayerType(payer_type),
        referral_expiry=parse_date(referral_expiry),
        symptoms=symptoms,
        bhyt_consent=bhyt_consent,
    )
    draft, warnings = booking.prepare_booking(ctx.db, user_id, ctx.chat_session_id, request)
    summary = booking.describe_draft(ctx.db, draft)
    add_card(ctx, {"type": "booking_draft", "draft": summary, "warnings": warnings})
    return {
        "draft_id": str(draft.id),
        "summary": {**summary, "slot_label": local_label(summary["slot_time"])},
        "warnings": warnings,
        "next_step": "Thẻ tóm tắt đã hiện. Người bệnh phải tự bấm Xác nhận, bạn không xác nhận thay được.",
    }


def list_my_appointments(ctx: ToolContext) -> list[dict]:
    user_id = require_login(ctx)
    booking.expire_holds(ctx.db)
    appointments = ctx.db.scalars(
        select(Appointment)
        .join(PatientProfile, Appointment.profile_id == PatientProfile.id)
        .where(
            PatientProfile.user_id == user_id,
            Appointment.status.in_(booking.ACTIVE_STATUSES),
            Appointment.slot_time >= clock.now(),
        )
        .order_by(Appointment.slot_time)
    )
    return [
        {**booking.describe(ctx.db, item), "slot_label": local_label(item.slot_time)}
        for item in appointments
    ]


def propose_cancel(ctx: ToolContext, appointment_id: int) -> dict:
    user_id = require_login(ctx)
    appointment = booking.owned_appointment(ctx.db, user_id, appointment_id)
    session = ctx.db.get(ClinicSession, appointment.session_id)
    if appointment.status not in booking.ACTIVE_STATUSES:
        raise BookingError("INVALID_STATUS", "Lịch hẹn này không hủy được")
    # BR-26
    if appointment.status == AppointmentStatus.confirmed and clock.now() >= booking.deadline(
        session.date, settings.cancel_cutoff
    ):
        raise BookingError(
            "CANCEL_DEADLINE_PASSED",
            "Đã quá hạn hủy online (15h00 ngày trước ngày khám). Người bệnh cần gọi tổng đài 1900 2827",
        )
    detail = booking.describe(ctx.db, appointment)
    add_card(ctx, {"type": "cancel_confirm", "appointment": detail})
    return {"appointment": {**detail, "slot_label": local_label(appointment.slot_time)},
            "next_step": "Thẻ xác nhận hủy đã hiện, người bệnh phải tự bấm."}


def propose_reschedule(ctx: ToolContext, appointment_id: int, session_id: int, slot_time: str) -> dict:
    user_id = require_login(ctx)
    appointment = booking.owned_appointment(ctx.db, user_id, appointment_id)
    old_session = ctx.db.get(ClinicSession, appointment.session_id)
    new_session = ctx.db.get(ClinicSession, session_id)
    if new_session is None:
        raise booking.not_found("ca khám")
    if appointment.status not in (AppointmentStatus.confirmed, AppointmentStatus.need_reschedule):
        raise BookingError("INVALID_STATUS", "Lịch hẹn này không sửa được")
    # BR-28
    if appointment.status == AppointmentStatus.confirmed:
        if appointment.edit_count >= 1:
            raise BookingError("EDIT_LIMIT", "Mỗi lịch hẹn chỉ được sửa 1 lần")
        if clock.now() >= booking.deadline(old_session.date, settings.edit_cutoff):
            raise BookingError("EDIT_DEADLINE_PASSED", "Đã quá hạn sửa lịch (16h30 ngày trước ngày khám)")
    new_time = parse_slot(slot_time)
    booking.check_slot(new_session, new_time)
    booking.check_booking_window(new_session.date)

    detail = booking.describe(ctx.db, appointment)
    new_slot = {"session_id": session_id, "slot_time": new_time, "label": local_label(new_time)}
    add_card(ctx, {"type": "reschedule_confirm", "appointment": detail, "new_slot": new_slot})
    return {"appointment": detail, "new_slot": new_slot,
            "next_step": "Thẻ xác nhận đổi lịch đã hiện, người bệnh phải tự bấm."}


HANDLERS = {
    "search_docs": search_docs,
    "list_departments": list_departments,
    "suggest_department": suggest_department,
    "get_doctors": get_doctors,
    "get_available_slots": get_available_slots,
    "get_profiles": get_profiles,
    "prepare_booking": prepare_booking,
    "list_my_appointments": list_my_appointments,
    "propose_cancel": propose_cancel,
    "propose_reschedule": propose_reschedule,
}


def to_json(value) -> str:
    return json.dumps(value, ensure_ascii=False, default=str)


def run_tool(ctx: ToolContext, name: str, arguments: dict) -> tuple[str, bool]:
    """Trả về (nội dung tool_result, có phải lỗi không). Lỗi nghiệp vụ trả mã để bot giải thích."""
    handler = HANDLERS.get(name)
    if handler is None:
        return to_json({"code": "UNKNOWN_TOOL", "message": f"Không có tool tên {name}"}), True
    try:
        return to_json(handler(ctx, **arguments)), False
    except BookingError as error:
        ctx.db.rollback()
        return to_json({"code": error.code, "message": error.message}), True
    except (TypeError, ValueError) as error:
        ctx.db.rollback()
        return to_json({"code": "INVALID_ARGUMENTS", "message": str(error)}), True
