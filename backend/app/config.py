from datetime import time
from zoneinfo import ZoneInfo

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    seed_password: str = "demo1234"
    timezone: str = "Asia/Ho_Chi_Minh"

    # BR-01, BR-02: khung giờ khám
    morning_start: time = time(7, 0)
    morning_end: time = time(12, 0)
    afternoon_start: time = time(13, 0)
    afternoon_end: time = time(16, 30)

    # BR-05, BR-06: slot mặc định
    slot_minutes: int = 30
    capacity_per_slot: int = 3

    # BR-07: đặt trước tối đa
    booking_window_days: int = 30

    @property
    def tz(self) -> ZoneInfo:
        return ZoneInfo(self.timezone)


settings = Settings()
