"""Index kho tri thức. Chạy: python -m app.index_knowledge [--force]"""

import sys

from sqlalchemy import func, select

from app.db import SessionLocal
from app.models import DocumentChunk
from app.services.knowledge import index_directory


def main() -> None:
    with SessionLocal() as db:
        result = index_directory(db, force="--force" in sys.argv)
        total = db.scalar(select(func.count()).select_from(DocumentChunk))
    print(
        f"{result['files']} file, index lại {result['changed']}, "
        f"lưu trữ {result['archived']}, tổng {total} đoạn"
    )


if __name__ == "__main__":
    main()
