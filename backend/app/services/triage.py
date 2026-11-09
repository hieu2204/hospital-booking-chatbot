"""UC-06: gợi ý chuyên khoa theo bảng ánh xạ triệu chứng, không chẩn đoán (BR-29)."""

import json
import re
from functools import lru_cache
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Department
from app.services.text import normalize_vi

DATA = Path(__file__).resolve().parent.parent / "data" / "symptom_map.json"
MAX_SUGGESTIONS = 2


@lru_cache
def load_map() -> dict:
    raw = json.loads(DATA.read_text(encoding="utf-8"))
    phrases = [
        (normalize_vi(phrase), department, phrase)
        for department, items in raw["departments"].items()
        for phrase in items
    ]
    return {
        "phrases": sorted(phrases, key=lambda item: -len(item[0])),
        "fallback": raw["fallback"],
        "disclaimer": raw["disclaimer"],
        "departments": list(raw["departments"]),
    }


def match_symptoms(text: str) -> dict[str, list[str]]:
    """Khớp cụm dài trước rồi che đi, để "ngứa mắt" không bị tính thêm là "ngứa"."""
    data = load_map()
    remaining = f" {normalize_vi(text)} "
    found: dict[str, list[str]] = {}
    for normalized, department, original in data["phrases"]:
        pattern = rf" {re.escape(normalized)} "
        if re.search(pattern, remaining):
            found.setdefault(department, []).append(original)
            remaining = re.sub(pattern, " # ", remaining)
    return found


def suggest_departments(db: Session, text: str) -> dict:
    data = load_map()
    found = match_symptoms(text)
    ranked = sorted(found.items(), key=lambda item: -sum(len(p) for p in item[1]))
    picks = ranked[:MAX_SUGGESTIONS] or [(data["fallback"], [])]

    ids = dict(db.execute(select(Department.name, Department.id)).all())
    return {
        "suggestions": [
            {"department_id": ids.get(name), "department": name, "matched": matched}
            for name, matched in picks
        ],
        "disclaimer": data["disclaimer"],
    }
