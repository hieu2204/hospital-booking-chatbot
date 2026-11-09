from datetime import time
from zoneinfo import ZoneInfo

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    encryption_key: str
    seed_password: str = "demo1234"
    demo_otp: str = "123456"
    token_minutes: int = 480
    timezone: str = "Asia/Ho_Chi_Minh"

    # BR-01, BR-02: khung giờ khám
    morning_start: time = time(7, 0)
    morning_end: time = time(12, 0)
    afternoon_start: time = time(13, 0)
    afternoon_end: time = time(16, 30)

    # BR-05, BR-06: slot mặc định
    slot_minutes: int = 30
    capacity_per_slot: int = 3

    # BR-07: đặt trước tối đa, hạn đặt lịch cho ngày mai
    booking_window_days: int = 30
    booking_cutoff: time = time(16, 30)

    # BR-14: số lịch tối đa của một hồ sơ trong một ngày
    max_appointments_per_day: int = 3

    # BR-16: thời gian giữ chỗ chờ thanh toán
    hold_minutes: int = 15

    # BR-32: bản nháp do chatbot tạo hết hạn sau
    draft_minutes: int = 15

    # BR-26, BR-28: hạn hủy, sửa vào ngày trước ngày khám
    cancel_cutoff: time = time(15, 0)
    edit_cutoff: time = time(16, 30)

    # RAG
    knowledge_dir: str = "/knowledge"
    embedding_model: str = "intfloat/multilingual-e5-large"
    model_cache_dir: str = "/models"
    search_top_k: int = 5
    search_min_score: float = 0.0
    preload_embedding: bool = True

    # Chatbot. Đổi mô hình bằng biến môi trường CHAT_MODEL (NFR-09)
    chat_model: str = "claude-sonnet-5-5"
    chat_effort: str = "low"
    chat_max_tokens: int = 8000
    chat_max_steps: int = 8
    chat_max_message_chars: int = 2000
    # Giá USD trên 1 triệu token (vào, ra), để theo dõi chi phí
    model_prices: dict[str, tuple[float, float]] = {
        "claude-sonnet-5-5": (2.0, 10.0),
        "claude-haiku-5-5": (0.10, 0.50),
    }

    @property
    def tz(self) -> ZoneInfo:
        return ZoneInfo(self.timezone)


settings = Settings()
