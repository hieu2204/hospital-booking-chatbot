"""18 bảng dữ liệu theo mục 8 của docs/srs.md."""

import enum
import uuid
from datetime import date, datetime, time
from datetime import date as date_type

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    Time,
    UniqueConstraint,
    false,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

EMBEDDING_DIM = 1024


class UserRole(str, enum.Enum):
    patient = "patient"
    doctor = "doctor"
    admin = "admin"


class Shift(str, enum.Enum):
    morning = "morning"
    afternoon = "afternoon"


class SessionStatus(str, enum.Enum):
    open = "open"
    locked = "locked"


class AppointmentStatus(str, enum.Enum):
    pending_payment = "pending_payment"
    confirmed = "confirmed"
    completed = "completed"
    expired = "expired"
    cancelled = "cancelled"
    need_reschedule = "need_reschedule"


class PayerType(str, enum.Enum):
    none = "none"
    bhyt_dung_tuyen = "bhyt_dung_tuyen"
    bhyt_trai_tuyen = "bhyt_trai_tuyen"
    bao_lanh = "bao_lanh"


class BookingChannel(str, enum.Enum):
    web = "web"
    chatbot = "chatbot"


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    refunded = "refunded"


class DraftStatus(str, enum.Enum):
    open = "open"
    used = "used"
    discarded = "discarded"


class DocumentStatus(str, enum.Enum):
    active = "active"
    archived = "archived"


class ChatRole(str, enum.Enum):
    user = "user"
    assistant = "assistant"
    tool = "tool"


def enum_type(enum_cls: type[enum.Enum]) -> Enum:
    return Enum(
        enum_cls,
        name=enum_cls.__name__.lower(),
        native_enum=False,
        create_constraint=True,
        length=32,
        values_callable=lambda e: [member.value for member in e],
    )


class Facility(Base):
    __tablename__ = "facilities"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    address: Mapped[str] = mapped_column(String(300))
    hotline: Mapped[str] = mapped_column(String(30))


class Department(Base):
    __tablename__ = "departments"
    __table_args__ = (UniqueConstraint("facility_id", "name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    facility_id: Mapped[int] = mapped_column(ForeignKey("facilities.id"))
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text)


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(primary_key=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"))
    name: Mapped[str] = mapped_column(String(60))
    area: Mapped[str | None] = mapped_column(String(30))
    floor: Mapped[str | None] = mapped_column(String(30))


class ServiceType(Base):
    __tablename__ = "service_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    allow_bhyt: Mapped[bool] = mapped_column(Boolean)
    choose_doctor: Mapped[bool] = mapped_column(Boolean)


class ServicePrice(Base):
    __tablename__ = "service_prices"

    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"), primary_key=True)
    service_type_id: Mapped[int] = mapped_column(ForeignKey("service_types.id"), primary_key=True)
    amount: Mapped[int] = mapped_column(Integer)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    phone: Mapped[str] = mapped_column(String(15), unique=True)
    password_hash: Mapped[str] = mapped_column(String(100))
    role: Mapped[UserRole] = mapped_column(enum_type(UserRole), default=UserRole.patient)
    full_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str | None] = mapped_column(String(160))


class Doctor(Base):
    __tablename__ = "doctors"

    id: Mapped[int] = mapped_column(primary_key=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"))
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(40))
    full_name: Mapped[str] = mapped_column(String(120))
    bio: Mapped[str | None] = mapped_column(Text)


class DoctorSchedule(Base):
    """Mẫu lịch tuần của bác sĩ (BR-08). weekday: 0 là thứ Hai."""

    __tablename__ = "doctor_schedules"
    __table_args__ = (UniqueConstraint("doctor_id", "weekday", "shift"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"))
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"))
    service_type_id: Mapped[int] = mapped_column(ForeignKey("service_types.id"))
    weekday: Mapped[int] = mapped_column(SmallInteger)
    shift: Mapped[Shift] = mapped_column(enum_type(Shift))
    slot_minutes: Mapped[int] = mapped_column(SmallInteger)
    capacity_per_slot: Mapped[int] = mapped_column(SmallInteger)


class ClinicSession(Base):
    """Ca khám theo ngày, sinh từ mẫu tuần. Đặt tên khác Session của SQLAlchemy."""

    __tablename__ = "sessions"
    __table_args__ = (UniqueConstraint("doctor_id", "date", "start_time"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    schedule_id: Mapped[int | None] = mapped_column(ForeignKey("doctor_schedules.id"))
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"))
    substitute_doctor_id: Mapped[int | None] = mapped_column(ForeignKey("doctors.id"))
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"))
    service_type_id: Mapped[int] = mapped_column(ForeignKey("service_types.id"))
    date: Mapped[date_type] = mapped_column(Date, index=True)
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    slot_minutes: Mapped[int] = mapped_column(SmallInteger)
    capacity_per_slot: Mapped[int] = mapped_column(SmallInteger)
    status: Mapped[SessionStatus] = mapped_column(
        enum_type(SessionStatus), default=SessionStatus.open
    )


class Holiday(Base):
    __tablename__ = "holidays"

    date: Mapped[date_type] = mapped_column(Date, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    dob: Mapped[date] = mapped_column(Date)
    gender: Mapped[str] = mapped_column(String(10))
    relation: Mapped[str] = mapped_column(String(40))
    id_number_enc: Mapped[str | None] = mapped_column(Text)
    bhyt_code_enc: Mapped[str | None] = mapped_column(Text)
    bhyt_rate: Mapped[int | None] = mapped_column(SmallInteger)
    hospital_patient_code: Mapped[str | None] = mapped_column(String(30))
    phone: Mapped[str | None] = mapped_column(String(15))
    email: Mapped[str | None] = mapped_column(String(160))
    address: Mapped[str | None] = mapped_column(String(300))


class Appointment(Base):
    __tablename__ = "appointments"
    __table_args__ = (
        # BR-14: một hồ sơ không có 2 lịch còn hiệu lực trùng giờ
        Index(
            "uq_appointments_profile_slot_active",
            "profile_id",
            "slot_time",
            unique=True,
            postgresql_where=text(
                "status IN ('pending_payment', 'confirmed', 'need_reschedule')"
            ),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("patient_profiles.id"))
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id"), index=True)
    slot_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    queue_no: Mapped[int | None] = mapped_column(SmallInteger)
    estimated_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    payer_type: Mapped[PayerType] = mapped_column(enum_type(PayerType), default=PayerType.none)
    referral_expiry: Mapped[date | None] = mapped_column(Date)
    symptoms: Mapped[str | None] = mapped_column(Text)
    bhyt_consent: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    status: Mapped[AppointmentStatus] = mapped_column(
        enum_type(AppointmentStatus), default=AppointmentStatus.pending_payment
    )
    edit_count: Mapped[int] = mapped_column(SmallInteger, default=0)
    channel: Mapped[BookingChannel] = mapped_column(enum_type(BookingChannel))
    hold_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id"), index=True)
    amount: Mapped[int] = mapped_column(Integer)
    method: Mapped[str] = mapped_column(String(30))
    status: Mapped[PaymentStatus] = mapped_column(
        enum_type(PaymentStatus), default=PaymentStatus.pending
    )
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    refunded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chat_sessions.id"), index=True)
    role: Mapped[ChatRole] = mapped_column(enum_type(ChatRole))
    content: Mapped[str] = mapped_column(Text)
    # Khối nội dung đúng như gửi hoặc nhận từ API, phát lại nguyên văn ở lượt sau
    blocks: Mapped[list | None] = mapped_column(JSONB)
    # NFR-10: các lần gọi tool trong lượt này và kết quả
    tool_calls: Mapped[list | None] = mapped_column(JSONB)
    sources: Mapped[list | None] = mapped_column(JSONB)
    # Thẻ hiển thị cho giao diện, token và chi phí
    meta: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class BookingDraft(Base):
    """Bản nháp do bot tạo. Chỉ nút Xác nhận mới biến nó thành lịch hẹn (BR-32)."""

    __tablename__ = "booking_drafts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chat_sessions.id"), index=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("patient_profiles.id"))
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id"))
    slot_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    payer_type: Mapped[PayerType] = mapped_column(enum_type(PayerType))
    referral_expiry: Mapped[date | None] = mapped_column(Date)
    symptoms: Mapped[str | None] = mapped_column(Text)
    bhyt_consent: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    status: Mapped[DraftStatus] = mapped_column(enum_type(DraftStatus), default=DraftStatus.open)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(40))
    source_url: Mapped[str | None] = mapped_column(Text)
    retrieved_at: Mapped[date | None] = mapped_column(Date)
    content: Mapped[str] = mapped_column(Text)
    status: Mapped[DocumentStatus] = mapped_column(
        enum_type(DocumentStatus), default=DocumentStatus.active
    )

    chunks: Mapped[list["DocumentChunk"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )


class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    __table_args__ = (UniqueConstraint("document_id", "chunk_index"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id"))
    chunk_index: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(EMBEDDING_DIM))
    # Embedding của bản không dấu, dùng khi người dùng gõ không dấu (NFR-07)
    embedding_plain: Mapped[list[float] | None] = mapped_column(Vector(EMBEDDING_DIM))

    document: Mapped[Document] = relationship(back_populates="chunks")
