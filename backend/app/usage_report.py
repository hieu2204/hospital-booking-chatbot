"""Tổng token và chi phí Claude đã dùng. Chạy: python -m app.usage_report"""

from collections import defaultdict

from sqlalchemy import select

from app.db import SessionLocal
from app.models import ChatMessage


def summarize() -> dict[str, dict]:
    totals: dict[str, dict] = defaultdict(lambda: defaultdict(float))
    with SessionLocal() as db:
        for meta in db.scalars(select(ChatMessage.meta).where(ChatMessage.meta.is_not(None))):
            usage = meta.get("usage")
            if not usage:
                continue
            row = totals[meta.get("model", "?")]
            row["turns"] += 1
            for key, value in usage.items():
                row[key] += value
    return {model: dict(row) for model, row in totals.items()}


def main() -> None:
    totals = summarize()
    if not totals:
        print("Chưa có lượt chat nào gọi Claude")
    for model, row in totals.items():
        print(
            f"{model}: {int(row['turns'])} lượt, vào {int(row['input'])} + đọc cache "
            f"{int(row['cache_read'])} + ghi cache {int(row['cache_write'])} token, "
            f"ra {int(row['output'])} token, khoảng ${row['cost_usd']:.4f}"
        )


if __name__ == "__main__":
    main()
