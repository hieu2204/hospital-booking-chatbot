import hashlib
import math

import pytest
from sqlalchemy import func, select

from app.config import settings
from app.db import SessionLocal
from app.models import Document, DocumentChunk, DocumentStatus, EMBEDDING_DIM
from app.services import embedding, knowledge

GUIDE = """---
title: Hướng dẫn BHYT
category: insurance
source: https://example.com/bhyt ; https://example.com/khac
retrieved: 2026-10-26
---

# Hướng dẫn BHYT

Mở đầu về bảo hiểm.

## Giấy tờ

Mang thẻ bảo hiểm.

### Trẻ em

Giấy khai sinh.

## Mục trống

## Mức hưởng

Tám mươi phần trăm.
"""

FAQ = """---
title: Câu hỏi thường gặp
category: faq
source: nội bộ
retrieved: 2026-10-26
---

# Câu hỏi thường gặp

## Nhóm một

**Giờ làm việc?**
Bảy giờ sáng.

**Chủ nhật có khám không?**
Không khám ngoại trú.
"""


def fake_vector(text: str) -> list[float]:
    """Vector theo từ: hai câu chung nhiều từ thì gần nhau."""
    vector = [0.0] * EMBEDDING_DIM
    for word in text.lower().split():
        vector[int(hashlib.md5(word.encode()).hexdigest(), 16) % EMBEDDING_DIM] += 1.0
    norm = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [value / norm for value in vector]


@pytest.fixture(autouse=True)
def fake_embedding(monkeypatch):
    monkeypatch.setattr(embedding, "embed_query", fake_vector)
    monkeypatch.setattr(
        embedding, "embed_passages", lambda texts: [fake_vector(text) for text in texts]
    )


def write_docs(tmp_path, **files):
    for name, content in files.items():
        (tmp_path / f"{name}.md").write_text(content, encoding="utf-8")


def index(tmp_path) -> dict:
    with SessionLocal() as db:
        return knowledge.index_directory(db, str(tmp_path))


def test_doc_frontmatter():
    parsed = knowledge.parse_markdown(GUIDE)
    assert parsed.title == "Hướng dẫn BHYT"
    assert parsed.source_url == "https://example.com/bhyt"
    assert parsed.retrieved_at.isoformat() == "2026-10-26"


def test_doc_frontmatter_khong_co_link():
    assert knowledge.parse_markdown(FAQ).source_url is None


def test_doc_thieu_frontmatter():
    with pytest.raises(ValueError):
        knowledge.parse_markdown("# Không có frontmatter")


def test_doc_chia_theo_muc_va_giu_ngu_canh():
    chunks = knowledge.split_chunks(knowledge.parse_markdown(GUIDE))
    assert len(chunks) == 4
    assert chunks[0].startswith("Hướng dẫn BHYT\nMở đầu")
    assert chunks[2].startswith("Hướng dẫn BHYT - Giấy tờ > Trẻ em\n")
    assert not any("Mục trống" in chunk for chunk in chunks)


def test_doc_faq_moi_cau_mot_doan():
    chunks = knowledge.split_chunks(knowledge.parse_markdown(FAQ))
    assert len(chunks) == 2
    assert chunks[1] == "Câu hỏi thường gặp - Chủ nhật có khám không?\nKhông khám ngoại trú."


def test_doc_doan_dai_duoc_chia_nho():
    text = "\n".join(f"Dòng số {i} " + "x" * 80 for i in range(30))
    parts = knowledge.split_long(text)
    assert len(parts) > 1
    assert all(len(part) <= knowledge.MAX_CHUNK_CHARS for part in parts)
    assert "\n".join(parts) == text


def test_fr27_index_lai_chi_khi_tai_lieu_doi(tmp_path):
    write_docs(tmp_path, **{"01-a": GUIDE, "02-b": FAQ})
    assert index(tmp_path)["changed"] == 2
    assert index(tmp_path)["changed"] == 0

    write_docs(tmp_path, **{"01-a": GUIDE.replace("Tám mươi", "Chín mươi")})
    assert index(tmp_path)["changed"] == 1
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(DocumentChunk)) == 6


def test_fr27_tai_lieu_bi_xoa_thi_luu_tru_va_khong_tim_thay(tmp_path):
    write_docs(tmp_path, **{"01-a": GUIDE, "02-b": FAQ})
    index(tmp_path)
    (tmp_path / "02-b.md").unlink()
    assert index(tmp_path)["archived"] == 1

    with SessionLocal() as db:
        document = db.scalar(select(Document).where(Document.title == "Câu hỏi thường gặp"))
        assert document.status == DocumentStatus.archived
        assert all(
            hit["title"] != document.title for hit in knowledge.search_docs(db, "Chủ nhật có khám")
        )


def test_fr15_ket_qua_kem_nguon_va_dung_thu_tu(tmp_path):
    write_docs(tmp_path, **{"01-a": GUIDE, "02-b": FAQ})
    index(tmp_path)
    with SessionLocal() as db:
        hits = knowledge.search_docs(db, "Chủ nhật có khám không?")
    assert hits[0]["title"] == "Câu hỏi thường gặp"
    assert "Không khám ngoại trú" in hits[0]["text"]
    assert hits[0]["score"] > hits[-1]["score"]


def test_nfr07_cau_khong_dau_tim_theo_ban_khong_dau(tmp_path):
    write_docs(tmp_path, **{"01-a": GUIDE, "02-b": FAQ})
    index(tmp_path)
    with SessionLocal() as db:
        hits = knowledge.search_docs(db, "chu nhat co kham khong")
    assert hits[0]["title"] == "Câu hỏi thường gặp"
    assert "Chủ nhật" in hits[0]["text"]


def test_br31_duoi_nguong_diem_thi_tra_rong(tmp_path, monkeypatch):
    write_docs(tmp_path, **{"01-a": GUIDE})
    index(tmp_path)
    monkeypatch.setattr(settings, "search_min_score", 0.99)
    with SessionLocal() as db:
        assert knowledge.search_docs(db, "giá vàng hôm nay") == []


def test_fr15_api_tim_kiem(client, tmp_path):
    write_docs(tmp_path, **{"01-a": GUIDE})
    index(tmp_path)
    response = client.get("/knowledge/search", params={"q": "thẻ bảo hiểm"})
    assert response.status_code == 200
    assert response.json()[0]["source_url"] == "https://example.com/bhyt"
