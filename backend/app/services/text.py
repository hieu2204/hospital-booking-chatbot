import re
import unicodedata


def normalize_vi(text: str) -> str:
    """Chữ thường, bỏ dấu, gộp khoảng trắng: "Khó THỞ!" -> "kho tho"."""
    text = unicodedata.normalize("NFD", text.lower()).replace("đ", "d")
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    return " ".join(re.findall(r"[a-z0-9]+", text))


def mask_pii(text: str) -> str:
    """BR-33: che dãy số dài (CCCD, số BHYT) trước khi lưu hoặc gửi cho LLM."""
    text = re.sub(r"\b[A-Za-z]{2}\d{13}\b", lambda m: "****" + m.group(0)[-4:], text)
    return re.sub(r"\b\d{9,15}\b", lambda m: "****" + m.group(0)[-4:], text)


def has_diacritics(text: str) -> bool:
    """Câu có dấu tiếng Việt hay không, ví dụ "kho tho" thì không."""
    plain = " ".join(re.findall(r"[a-z0-9]+", text.lower()))
    return normalize_vi(text) != plain
