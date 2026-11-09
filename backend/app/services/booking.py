"""Nghiệp vụ đặt lịch dùng chung cho form và chatbot. Mọi quy tắc BR kiểm tra ở đây."""

import secrets
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import clock
from app.config import settings
from app.models import (
    Appointment,
    AppointmentStatus,
    BookingChannel,
    BookingDraft,
    ChatSession,
    ClinicSession,
    Department,
    DraftStatus,
    Doctor,
    PatientProfile,
    PayerType,
    Payment,
    PaymentStatus,
    Room,
    ServicePrice,
    ServiceType,
    SessionStatus,
)
from app.services.schedule import slot_times

ACTIVE_STATUSES = (
    AppointmentStatus.pending_payment,
    AppointmentStatus.confirmed,
    AppointmentStatus.need_reschedule,
)
BHYT_TYPES = (PayerType.bhyt_dung_tuyen, PayerType.bhyt_trai_tuyen)

# BR-25: hướng dẫn khi đến viện theo đối tượng thanh toán
INSTRUCTIONS = {
    PayerType.none: "Đến thẳng phòng khám ghi trên phiếu, trước giờ hẹn 15–30 phút.",
    PayerType.bhyt_dung_tuyen: (
        "Đến quầy 12, 13, 14 tầng trệt Khu A để xác nhận BHYT trước khi vào phòng khám. "
        "Mang thẻ BHYT, giấy tờ có ảnh, giấy chuyển tuyến hoặc giấy hẹn khám lại."
    ),
    PayerType.bhyt_trai_tuyen: (
        "Đến quầy 12, 13, 14 tầng trệt Khu A để xác nhận BHYT trước khi vào phòng khám. "
        "Mang thẻ BHYT và giấy tờ có ảnh."
    ),
    PayerType.bao_lanh: "Đến quầy đăng ký khám bệnh tầng trệt Khu A để làm thủ tục bảo lãnh.",
}


class BookingError(Exception):
    """Lỗi nghiệp vụ. `code` ổn định để chatbot giải thích được cho người bệnh."""

    def __init__(self, code: str, message: str, status_code: int = 409):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


@dataclass
class BookingRequest:
    profile_id: int
    session_id: int
    slot_time: datetime
    payer_type: PayerType = PayerType.none
    referral_expiry: date | None = None
    symptoms: str | None = None
    bhyt_consent: bool = False


def not_found(what: str) -> BookingError:
    return BookingError("NOT_FOUND", f"Không tìm thấy {what}", 404)


def deadline(day: date, cutoff: time) -> datetime:
    """Mốc giờ `cutoff` của ngày trước `day`."""
    return datetime.combine(day - timedelta(days=1), cutoff, tzinfo=settings.tz)


def expire_holds(db: Session) -> None:
    """BR-16: lịch quá hạn giữ chỗ chuyển sang expired và trả slot."""
    db.execute(
        update(Appointment)
        .where(
            Appointment.status == AppointmentStatus.pending_payment,
            Appointment.hold_expires_at < clock.now(),
        )
        .values(status=AppointmentStatus.expired)
    )
    db.commit()


def earliest_bookable_day() -> date:
    """BR-07: không đặt trong ngày; đặt cho ngày mai phải trước 16h30 hôm nay."""
    now = clock.now()
    if now.time() >= settings.booking_cutoff:
        return now.date() + timedelta(days=2)
    return now.date() + timedelta(days=1)


def check_booking_window(day: date) -> None:
    today = clock.now().date()
    if day > today + timedelta(days=settings.booking_window_days):
        raise BookingError(
            "TOO_FAR",
            f"Chỉ đặt trước tối đa {settings.booking_window_days} ngày",
        )
    if day < earliest_bookable_day():
        raise BookingError(
            "TOO_LATE",
            "Không đặt được ngày này. Lịch ngày mai phải đặt trước 16h30 hôm nay",
        )


def check_slot(session: ClinicSession, slot_time: datetime) -> None:
    local = slot_time.astimezone(settings.tz)
    valid = slot_times(session.start_time, session.end_time, session.slot_minutes)
    if local.date() != session.date or local.time() not in valid:
        raise BookingError("INVALID_SLOT", "Giờ khám không thuộc ca này", 422)
    if session.status != SessionStatus.open:
        raise BookingError("SESSION_LOCKED", "Ca khám này đã khóa")


def check_capacity(db: Session, session: ClinicSession, slot_time: datetime) -> None:
    """BR-06, BR-15: gọi khi đã khóa dòng session."""
    booked = db.scalar(
        select(func.count())
        .select_from(Appointment)
        .where(
            Appointment.session_id == session.id,
            Appointment.slot_time == slot_time,
            Appointment.status.in_(ACTIVE_STATUSES),
        )
    )
    if booked >= session.capacity_per_slot:
        raise BookingError("SLOT_FULL", "Khung giờ này đã hết chỗ")


def check_profile_day(
    db: Session,
    profile_id: int,
    day: date,
    slot_time: datetime,
    payer_type: PayerType,
    exclude_id: int | None = None,
) -> None:
    """BR-14, BR-23: giới hạn trong ngày của một hồ sơ."""
    query = (
        select(Appointment)
        .join(ClinicSession, Appointment.session_id == ClinicSession.id)
        .where(
            Appointment.profile_id == profile_id,
            ClinicSession.date == day,
            Appointment.status.in_(ACTIVE_STATUSES),
        )
    )
    if exclude_id is not None:
        query = query.where(Appointment.id != exclude_id)
    same_day = db.scalars(query).all()

    if any(item.slot_time == slot_time for item in same_day):
        raise BookingError("DUPLICATE_TIME", "Hồ sơ này đã có lịch trùng giờ")
    if len(same_day) >= settings.max_appointments_per_day:
        raise BookingError(
            "DAILY_LIMIT",
            f"Mỗi hồ sơ tối đa {settings.max_appointments_per_day} lịch một ngày",
        )
    if payer_type in BHYT_TYPES and any(
        item.payer_type in BHYT_TYPES and item.payer_type != payer_type for item in same_day
    ):
        raise BookingError(
            "MIXED_BHYT", "Trong một ngày không dùng BHYT cho cả đúng tuyến và trái tuyến"
        )


def check_payer(
    service: ServiceType, profile: PatientProfile, payer_type: PayerType, consent: bool
) -> None:
    if payer_type not in BHYT_TYPES:
        return
    # BR-24
    if not service.allow_bhyt:
        raise BookingError("BHYT_NOT_ALLOWED", f"{service.name} không áp dụng BHYT")
    if profile.bhyt_code_enc is None:
        raise BookingError("PROFILE_MISSING_BHYT", "Hồ sơ chưa có số thẻ BHYT")
    # BR-22
    if payer_type == PayerType.bhyt_trai_tuyen and not consent:
        raise BookingError("CONSENT_REQUIRED", "Khám trái tuyến cần đồng ý cam kết")


def booking_warnings(day: date, payer_type: PayerType, referral_expiry: date | None) -> list[str]:
    # BR-21: chỉ cảnh báo, giấy chuyển tuyến được kiểm tra lại tại quầy
    if payer_type == PayerType.bhyt_dung_tuyen and referral_expiry and referral_expiry < day:
        return ["REFERRAL_EXPIRES_BEFORE_VISIT"]
    return []


def session_price(db: Session, session: ClinicSession) -> int:
    department_id = db.scalar(select(Room.department_id).where(Room.id == session.room_id))
    price = db.get(ServicePrice, (department_id, session.service_type_id))
    if price is None:
        raise BookingError("PRICE_MISSING", "Chưa cấu hình giá khám", 500)
    return price.amount


def owned_profile(db: Session, user_id: int, profile_id: int, lock: bool = False) -> PatientProfile:
    query = select(PatientProfile).where(
        PatientProfile.id == profile_id, PatientProfile.user_id == user_id
    )
    profile = db.scalar(query.with_for_update() if lock else query)
    if profile is None:
        raise not_found("hồ sơ")
    return profile


def lock_session_row(db: Session, session_id: int) -> ClinicSession:
    session = db.scalar(
        select(ClinicSession).where(ClinicSession.id == session_id).with_for_update()
    )
    if session is None:
        raise not_found("ca khám")
    return session


def owned_appointment(
    db: Session, user_id: int, appointment_id: int, lock: bool = False
) -> Appointment:
    query = select(Appointment).where(Appointment.id == appointment_id)
    appointment = db.scalar(query.with_for_update() if lock else query)
    if appointment is None or db.get(PatientProfile, appointment.profile_id).user_id != user_id:
        raise not_found("lịch hẹn")
    return appointment


def validate_booking(
    db: Session, user_id: int, request: BookingRequest
) -> tuple[PatientProfile, ClinicSession]:
    """Kiểm tra toàn bộ quy tắc. Khóa dòng hồ sơ và ca khám đến hết transaction."""
    profile = owned_profile(db, user_id, request.profile_id, lock=True)
    session = lock_session_row(db, request.session_id)
    check_slot(session, request.slot_time)
    check_booking_window(session.date)
    check_payer(
        db.get(ServiceType, session.service_type_id),
        profile,
        request.payer_type,
        request.bhyt_consent,
    )
    check_profile_day(db, profile.id, session.date, request.slot_time, request.payer_type)
    check_capacity(db, session, request.slot_time)
    return profile, session


def create_appointment(
    db: Session, user_id: int, request: BookingRequest, channel: BookingChannel
) -> tuple[Appointment, list[str]]:
    expire_holds(db)
    appointment, warnings = insert_appointment(db, user_id, request, channel)
    db.commit()
    return appointment, warnings


def insert_appointment(
    db: Session, user_id: int, request: BookingRequest, channel: BookingChannel
) -> tuple[Appointment, list[str]]:
    """Kiểm tra quy tắc rồi tạo lịch giữ chỗ, chưa commit."""
    profile, session = validate_booking(db, user_id, request)

    appointment = Appointment(
        code="LK" + secrets.token_hex(4).upper(),
        profile_id=profile.id,
        session_id=session.id,
        slot_time=request.slot_time,
        payer_type=request.payer_type,
        referral_expiry=request.referral_expiry,
        symptoms=request.symptoms,
        bhyt_consent=request.bhyt_consent,
        status=AppointmentStatus.pending_payment,
        channel=channel,
        hold_expires_at=clock.now() + timedelta(minutes=settings.hold_minutes),
    )
    db.add(appointment)
    try:
        db.flush()
    except IntegrityError as error:
        db.rollback()
        raise BookingError("DUPLICATE_TIME", "Hồ sơ này đã có lịch trùng giờ") from error
    db.add(
        Payment(appointment_id=appointment.id, amount=session_price(db, session), method="demo")
    )
    return appointment, booking_warnings(session.date, request.payer_type, request.referral_expiry)


def assign_queue(db: Session, appointment: Appointment, session: ClinicSession) -> None:
    """BR-07a: số thứ tự theo thứ tự thanh toán trong ca. Gọi khi đã khóa dòng session."""
    last_no = db.scalar(
        select(func.max(Appointment.queue_no)).where(
            Appointment.session_id == session.id, Appointment.id != appointment.id
        )
    )
    ahead = db.scalar(
        select(func.count())
        .select_from(Appointment)
        .where(
            Appointment.session_id == session.id,
            Appointment.slot_time == appointment.slot_time,
            Appointment.status == AppointmentStatus.confirmed,
            Appointment.id != appointment.id,
        )
    )
    minutes_each = session.slot_minutes // session.capacity_per_slot
    appointment.queue_no = (last_no or 0) + 1
    appointment.estimated_time = appointment.slot_time + timedelta(minutes=ahead * minutes_each)


def pay_appointment(db: Session, user_id: int, appointment_id: int) -> Appointment:
    expire_holds(db)
    appointment = owned_appointment(db, user_id, appointment_id, lock=True)
    if appointment.status == AppointmentStatus.expired:
        raise BookingError("HOLD_EXPIRED", "Lịch đã hết thời gian giữ chỗ, vui lòng đặt lại")
    if appointment.status != AppointmentStatus.pending_payment:
        raise BookingError("INVALID_STATUS", "Lịch hẹn không ở trạng thái chờ thanh toán")

    session = lock_session_row(db, appointment.session_id)
    payment = db.scalar(select(Payment).where(Payment.appointment_id == appointment.id))
    payment.status = PaymentStatus.paid
    payment.paid_at = clock.now()
    assign_queue(db, appointment, session)
    appointment.status = AppointmentStatus.confirmed
    appointment.hold_expires_at = None
    db.commit()
    return appointment


def cancel_appointment(db: Session, user_id: int, appointment_id: int) -> Appointment:
    appointment = owned_appointment(db, user_id, appointment_id, lock=True)
    session = db.get(ClinicSession, appointment.session_id)

    if appointment.status not in ACTIVE_STATUSES:
        raise BookingError("INVALID_STATUS", "Lịch hẹn này không hủy được")
    # BR-26. Lịch chờ đổi do bác sĩ nghỉ thì không tính hạn hủy
    if appointment.status == AppointmentStatus.confirmed and clock.now() >= deadline(
        session.date, settings.cancel_cutoff
    ):
        raise BookingError(
            "CANCEL_DEADLINE_PASSED",
            "Đã quá hạn hủy online (15h00 ngày trước ngày khám). Vui lòng gọi tổng đài 1900 2827",
        )

    appointment.status = AppointmentStatus.cancelled
    # BR-27
    payment = db.scalar(select(Payment).where(Payment.appointment_id == appointment.id))
    if payment.status == PaymentStatus.paid:
        payment.status = PaymentStatus.refunded
        payment.refunded_at = clock.now()
    db.commit()
    return appointment


def reschedule_appointment(
    db: Session, user_id: int, appointment_id: int, session_id: int, slot_time: datetime
) -> Appointment:
    expire_holds(db)
    appointment = owned_appointment(db, user_id, appointment_id, lock=True)
    was_confirmed = appointment.status == AppointmentStatus.confirmed

    if appointment.status not in (
        AppointmentStatus.confirmed,
        AppointmentStatus.need_reschedule,
    ):
        raise BookingError("INVALID_STATUS", "Lịch hẹn này không sửa được")

    # Khóa theo thứ tự id để hai yêu cầu đổi chéo không deadlock
    sessions = {
        id_: lock_session_row(db, id_) for id_ in sorted({appointment.session_id, session_id})
    }
    old_session, new_session = sessions[appointment.session_id], sessions[session_id]

    # BR-28. Lịch chờ đổi do bác sĩ nghỉ thì không tính vào giới hạn sửa
    if was_confirmed:
        if appointment.edit_count >= 1:
            raise BookingError("EDIT_LIMIT", "Mỗi lịch hẹn chỉ được sửa 1 lần")
        if clock.now() >= deadline(old_session.date, settings.edit_cutoff):
            raise BookingError(
                "EDIT_DEADLINE_PASSED", "Đã quá hạn sửa lịch (16h30 ngày trước ngày khám)"
            )

    same_department = db.scalar(
        select(Room.department_id).where(Room.id == old_session.room_id)
    ) == db.scalar(select(Room.department_id).where(Room.id == new_session.room_id))
    if not same_department or old_session.service_type_id != new_session.service_type_id:
        raise BookingError("INVALID_SLOT", "Chỉ đổi được trong cùng khoa và hình thức khám", 422)
    if new_session.id == old_session.id and appointment.slot_time == slot_time:
        raise BookingError("SAME_SLOT", "Lịch mới trùng lịch hiện tại")

    check_slot(new_session, slot_time)
    check_booking_window(new_session.date)
    check_profile_day(
        db,
        appointment.profile_id,
        new_session.date,
        slot_time,
        appointment.payer_type,
        exclude_id=appointment.id,
    )
    check_capacity(db, new_session, slot_time)

    appointment.session_id = new_session.id
    appointment.slot_time = slot_time
    assign_queue(db, appointment, new_session)
    appointment.status = AppointmentStatus.confirmed
    if was_confirmed:
        appointment.edit_count += 1
    db.commit()
    return appointment


def set_substitute(db: Session, session_id: int, substitute_doctor_id: int) -> ClinicSession:
    """BR-09: lịch hẹn giữ nguyên, phiếu khám hiện bác sĩ khám thay."""
    session = lock_session_row(db, session_id)
    doctor = db.get(Doctor, session.doctor_id)
    substitute = db.get(Doctor, substitute_doctor_id)
    if substitute is None or substitute.department_id != doctor.department_id:
        raise BookingError("INVALID_SUBSTITUTE", "Bác sĩ khám thay phải cùng khoa", 422)
    session.substitute_doctor_id = substitute.id
    db.commit()
    return session


def lock_session(db: Session, session_id: int) -> ClinicSession:
    """BR-10, BR-28a: khóa ca khi bác sĩ nghỉ, chỉ làm được trước hạn sửa lịch."""
    session = lock_session_row(db, session_id)
    if clock.now() >= deadline(session.date, settings.edit_cutoff):
        raise BookingError(
            "SUBSTITUTE_REQUIRED", "Đã quá 16h30 hôm trước, phải chỉ định bác sĩ khám thay"
        )
    session.status = SessionStatus.locked
    db.execute(
        update(Appointment)
        .where(
            Appointment.session_id == session.id,
            Appointment.status == AppointmentStatus.confirmed,
        )
        .values(status=AppointmentStatus.need_reschedule)
    )
    db.execute(
        update(Appointment)
        .where(
            Appointment.session_id == session.id,
            Appointment.status == AppointmentStatus.pending_payment,
        )
        .values(status=AppointmentStatus.cancelled)
    )
    db.commit()
    return session


def complete_appointment(db: Session, appointment_id: int) -> Appointment:
    appointment = db.get(Appointment, appointment_id)
    if appointment is None:
        raise not_found("lịch hẹn")
    if appointment.status != AppointmentStatus.confirmed:
        raise BookingError("INVALID_STATUS", "Chỉ hoàn tất được lịch đã xác nhận")
    appointment.status = AppointmentStatus.completed
    db.commit()
    return appointment


def available_slots(
    db: Session,
    department_id: int | None,
    doctor_id: int | None,
    service_type_id: int | None,
    date_from: date | None,
    date_to: date | None,
) -> list[dict]:
    expire_holds(db)
    first = max(date_from or date.min, earliest_bookable_day())
    limit = clock.now().date() + timedelta(days=settings.booking_window_days)
    last = min(date_to or first + timedelta(days=6), limit)

    query = (
        select(ClinicSession, Room, ServiceType, ServicePrice.amount)
        .join(Room, ClinicSession.room_id == Room.id)
        .join(ServiceType, ClinicSession.service_type_id == ServiceType.id)
        .join(
            ServicePrice,
            (ServicePrice.department_id == Room.department_id)
            & (ServicePrice.service_type_id == ServiceType.id),
        )
        .where(
            ClinicSession.status == SessionStatus.open,
            ClinicSession.date.between(first, last),
        )
        .order_by(ClinicSession.date, ClinicSession.start_time, ClinicSession.id)
    )
    if department_id is not None:
        query = query.where(Room.department_id == department_id)
    if doctor_id is not None:
        query = query.where(ClinicSession.doctor_id == doctor_id)
    if service_type_id is not None:
        query = query.where(ClinicSession.service_type_id == service_type_id)
    rows = db.execute(query).all()

    session_ids = [row.ClinicSession.id for row in rows]
    booked = {
        (session_id, slot_time): count
        for session_id, slot_time, count in db.execute(
            select(Appointment.session_id, Appointment.slot_time, func.count())
            .where(
                Appointment.session_id.in_(session_ids),
                Appointment.status.in_(ACTIVE_STATUSES),
            )
            .group_by(Appointment.session_id, Appointment.slot_time)
        )
    }
    doctors = {doctor.id: doctor for doctor in db.scalars(select(Doctor))}

    slots = []
    for session, room, service, amount in rows:
        doctor = doctors[session.substitute_doctor_id or session.doctor_id]
        for start in slot_times(session.start_time, session.end_time, session.slot_minutes):
            slot_time = datetime.combine(session.date, start, tzinfo=settings.tz)
            remaining = session.capacity_per_slot - booked.get((session.id, slot_time), 0)
            if remaining > 0:
                slots.append(
                    {
                        "session_id": session.id,
                        "slot_time": slot_time,
                        "remaining": remaining,
                        "doctor_id": doctor.id,
                        "doctor_name": f"{doctor.title} {doctor.full_name}",
                        "room": room.name,
                        "service_type": service.name,
                        "price": amount,
                    }
                )
    return slots


def describe(db: Session, appointment: Appointment) -> dict:
    session = db.get(ClinicSession, appointment.session_id)
    room = db.get(Room, session.room_id)
    doctor = db.get(Doctor, session.substitute_doctor_id or session.doctor_id)
    payment = db.scalar(select(Payment).where(Payment.appointment_id == appointment.id))
    return {
        "id": appointment.id,
        "code": appointment.code,
        "status": appointment.status,
        "profile_id": appointment.profile_id,
        "patient_name": db.get(PatientProfile, appointment.profile_id).full_name,
        "department": db.get(Department, room.department_id).name,
        "doctor_name": f"{doctor.title} {doctor.full_name}",
        "room": room.name,
        "service_type": db.get(ServiceType, session.service_type_id).name,
        "slot_time": appointment.slot_time,
        "queue_no": appointment.queue_no,
        "estimated_time": appointment.estimated_time,
        "payer_type": appointment.payer_type,
        "price": payment.amount,
        "payment_status": payment.status.value,
        "hold_expires_at": appointment.hold_expires_at,
        "edit_count": appointment.edit_count,
    }


def ticket(db: Session, user_id: int, appointment_id: int) -> dict:
    """BR-17: phiếu khám điện tử, chỉ có khi lịch đã xác nhận."""
    appointment = owned_appointment(db, user_id, appointment_id)
    if appointment.status != AppointmentStatus.confirmed:
        raise BookingError("TICKET_NOT_READY", "Lịch hẹn chưa được xác nhận")
    return {
        **describe(db, appointment),
        "qr_payload": appointment.code,
        "instructions": INSTRUCTIONS[appointment.payer_type],
    }


def owned_chat_session(db: Session, user_id: int, chat_session_id) -> ChatSession:
    chat = db.get(ChatSession, chat_session_id)
    if chat is None or chat.user_id != user_id:
        raise not_found("phiên chat")
    return chat


def prepare_booking(
    db: Session, user_id: int, chat_session_id, request: BookingRequest
) -> tuple[BookingDraft, list[str]]:
    """BR-32: chatbot chỉ tạo bản nháp, chưa giữ chỗ. Kiểm tra trước mọi quy tắc."""
    expire_holds(db)
    owned_chat_session(db, user_id, chat_session_id)
    _, session = validate_booking(db, user_id, request)

    draft = BookingDraft(
        chat_session_id=chat_session_id,
        profile_id=request.profile_id,
        session_id=session.id,
        slot_time=request.slot_time,
        payer_type=request.payer_type,
        referral_expiry=request.referral_expiry,
        symptoms=request.symptoms,
        bhyt_consent=request.bhyt_consent,
        expires_at=clock.now() + timedelta(minutes=settings.draft_minutes),
    )
    db.add(draft)
    warnings = booking_warnings(session.date, request.payer_type, request.referral_expiry)
    db.commit()
    return draft, warnings


def owned_draft(db: Session, user_id: int, draft_id, lock: bool = False) -> BookingDraft:
    query = select(BookingDraft).where(BookingDraft.id == draft_id)
    draft = db.scalar(query.with_for_update() if lock else query)
    if draft is None or db.get(ChatSession, draft.chat_session_id).user_id != user_id:
        raise not_found("bản nháp")
    return draft


def discard_draft(db: Session, draft_id) -> None:
    db.execute(
        update(BookingDraft)
        .where(BookingDraft.id == draft_id, BookingDraft.status == DraftStatus.open)
        .values(status=DraftStatus.discarded)
    )
    db.commit()


def confirm_draft(db: Session, user_id: int, draft_id) -> tuple[Appointment, list[str]]:
    """Nút Xác nhận gọi thẳng hàm này, không qua LLM (BR-32, E3, E4)."""
    expire_holds(db)
    draft = owned_draft(db, user_id, draft_id, lock=True)
    if draft.status != DraftStatus.open:
        raise BookingError("DRAFT_USED", "Bản nháp này đã được xử lý")
    if draft.expires_at <= clock.now():
        draft.status = DraftStatus.discarded
        db.commit()
        raise BookingError("DRAFT_EXPIRED", "Bản nháp đã hết hạn, vui lòng chọn lại giờ khám")

    request = BookingRequest(
        profile_id=draft.profile_id,
        session_id=draft.session_id,
        slot_time=draft.slot_time,
        payer_type=draft.payer_type,
        referral_expiry=draft.referral_expiry,
        symptoms=draft.symptoms,
        bhyt_consent=draft.bhyt_consent,
    )
    try:
        appointment, warnings = insert_appointment(db, user_id, request, BookingChannel.chatbot)
    except BookingError:
        db.rollback()
        discard_draft(db, draft_id)
        raise
    draft.status = DraftStatus.used
    db.commit()
    return appointment, warnings


def describe_draft(db: Session, draft: BookingDraft) -> dict:
    """Thẻ tóm tắt hiển thị trước khi người bệnh bấm Xác nhận."""
    session = db.get(ClinicSession, draft.session_id)
    room = db.get(Room, session.room_id)
    doctor = db.get(Doctor, session.substitute_doctor_id or session.doctor_id)
    return {
        "id": draft.id,
        "status": draft.status,
        "patient_name": db.get(PatientProfile, draft.profile_id).full_name,
        "department": db.get(Department, room.department_id).name,
        "doctor_name": f"{doctor.title} {doctor.full_name}",
        "room": room.name,
        "service_type": db.get(ServiceType, session.service_type_id).name,
        "slot_time": draft.slot_time,
        "payer_type": draft.payer_type,
        "price": session_price(db, session),
        "expires_at": draft.expires_at,
    }
