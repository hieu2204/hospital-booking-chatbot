"""BR-30, UC-09: phát hiện dấu hiệu cấp cứu, chạy trước khi tin nhắn tới LLM.

Câu cảnh báo cố định, không do LLM sinh ra, nên vẫn hoạt động khi LLM lỗi.
"""

import json
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from app.services.text import normalize_vi

DATA = Path(__file__).resolve().parent.parent / "data" / "emergency_signs.json"


@dataclass
class SafetyResult:
    is_emergency: bool
    category: str | None = None
    matched: str | None = None
    message: str | None = None


@lru_cache
def load_rules() -> dict:
    raw = json.loads(DATA.read_text(encoding="utf-8"))
    phrases = [
        (normalize_vi(phrase), category)
        for category, items in raw["categories"].items()
        for phrase in items
    ]
    return {
        # Cụm dài trước để "đau ngực dữ dội" thắng "đau ngực"
        "phrases": sorted(phrases, key=lambda item: -len(item[0])),
        "negations": [normalize_vi(word) for word in raw["negations"]],
        "messages": raw["messages"],
    }


def is_negated(text: str, start: int, negations: list[str]) -> bool:
    """Phủ định ngay trước cụm từ, ví dụ "không khó thở", "hết co giật"."""
    before = text[:start].split()[-2:]
    return any(" ".join(before[-len(n.split()):]) == n for n in negations)


def check_message(message: str) -> SafetyResult:
    rules = load_rules()
    text = normalize_vi(message)
    for phrase, category in rules["phrases"]:
        for match in re.finditer(rf"\b{re.escape(phrase)}\b", text):
            if not is_negated(text, match.start(), rules["negations"]):
                return SafetyResult(
                    is_emergency=True,
                    category=category,
                    matched=phrase,
                    message=rules["messages"].get(category, rules["messages"]["default"]),
                )
    return SafetyResult(is_emergency=False)
