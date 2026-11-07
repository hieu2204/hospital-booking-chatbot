from datetime import timedelta

import bcrypt
import jwt
from cryptography.fernet import Fernet

from app import clock
from app.config import settings

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_access_token(user_id: int) -> str:
    expires = clock.now() + timedelta(minutes=settings.token_minutes)
    return jwt.encode(
        {"sub": str(user_id), "exp": expires}, settings.jwt_secret, algorithm=ALGORITHM
    )


def decode_access_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
    return int(payload["sub"])


def encrypt(value: str) -> str:
    return Fernet(settings.encryption_key).encrypt(value.encode()).decode()


def decrypt(value: str) -> str:
    return Fernet(settings.encryption_key).decrypt(value.encode()).decode()


def mask(encrypted: str | None) -> str | None:
    """Dạng che để hiển thị hoặc gửi cho LLM (BR-33)."""
    if encrypted is None:
        return None
    return "****" + decrypt(encrypted)[-4:]
