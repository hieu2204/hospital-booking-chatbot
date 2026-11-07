from datetime import datetime

from app.config import settings


def now() -> datetime:
    """Giờ hiện tại theo múi giờ bệnh viện. Test thay hàm này để cố định thời gian."""
    return datetime.now(settings.tz)
