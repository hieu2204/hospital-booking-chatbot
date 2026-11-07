from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models import AppointmentStatus, PayerType, Shift, UserRole

PHONE = r"^0\d{9}$"


class RegisterIn(BaseModel):
    phone: str = Field(pattern=PHONE)
    password: str = Field(min_length=6)
    full_name: str = Field(min_length=1, max_length=120)
    email: str | None = None
    otp: str


class LoginIn(BaseModel):
    phone: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    phone: str
    full_name: str
    email: str | None
    role: UserRole


class ProfileIn(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    dob: date
    gender: str
    relation: str
    id_number: str | None = None
    bhyt_code: str | None = None
    bhyt_rate: int | None = Field(default=None, ge=0, le=100)
    hospital_patient_code: str | None = None
    phone: str | None = Field(default=None, pattern=PHONE)
    email: str | None = None
    address: str | None = None


class ProfileUpdate(ProfileIn):
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    dob: date | None = None
    gender: str | None = None
    relation: str | None = None


class ProfileOut(BaseModel):
    id: int
    full_name: str
    dob: date
    gender: str
    relation: str
    id_number_masked: str | None
    bhyt_code_masked: str | None
    bhyt_rate: int | None
    hospital_patient_code: str | None
    phone: str | None
    email: str | None
    address: str | None


class DepartmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None


class ServiceTypeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    allow_bhyt: bool
    choose_doctor: bool


class WeeklySlotOut(BaseModel):
    weekday: int
    shift: Shift
    service_type: str
    room: str


class DoctorOut(BaseModel):
    id: int
    department_id: int
    title: str
    full_name: str
    bio: str | None
    schedule: list[WeeklySlotOut]


class SlotOut(BaseModel):
    session_id: int
    slot_time: datetime
    remaining: int
    doctor_id: int
    doctor_name: str
    room: str
    service_type: str
    price: int


class AppointmentCreate(BaseModel):
    profile_id: int
    session_id: int
    slot_time: datetime
    payer_type: PayerType = PayerType.none
    referral_expiry: date | None = None
    symptoms: str | None = None
    bhyt_consent: bool = False


class RescheduleIn(BaseModel):
    session_id: int
    slot_time: datetime


class AppointmentOut(BaseModel):
    id: int
    code: str
    status: AppointmentStatus
    profile_id: int
    patient_name: str
    department: str
    doctor_name: str
    room: str
    service_type: str
    slot_time: datetime
    queue_no: int | None
    estimated_time: datetime | None
    payer_type: PayerType
    price: int
    payment_status: str
    hold_expires_at: datetime | None
    edit_count: int


class BookingResult(BaseModel):
    appointment: AppointmentOut
    warnings: list[str]


class TicketOut(AppointmentOut):
    qr_payload: str
    instructions: str


class LockSessionIn(BaseModel):
    substitute_doctor_id: int | None = None
