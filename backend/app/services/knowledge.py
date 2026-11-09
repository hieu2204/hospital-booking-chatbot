"""Kho tri thức cho RAG: đọc file markdown, chia đoạn, index và tìm kiếm (FR-15, FR-27)."""

import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Document, DocumentChunk, DocumentStatus
from app.services import embedding
from app.services.text import has_diacritics, normalize_vi

MAX_CHUNK_CHARS = 900


@dataclass
class ParsedDocument:
    title: str
    category: str
    source_url: str | None
    retrieved_at: date | None
    body: str


def parse_markdown(text: str) -> ParsedDocument:
    """Tách phần frontmatter `key: value` khỏi nội dung."""
    match = re.match(r"^---\n(.*?)\n---\n(.*)$", text.replace("\r\n", "\n"), re.DOTALL)
    if match is None:
        raise ValueError("Tài liệu thiếu frontmatter")

    meta = {}
    for line in match.group(1).splitlines():
        key, _, value = line.partition(":")
        meta[key.strip()] = value.strip()

    url = re.search(r"https?://[^\s;]+", meta.get("source", ""))
    retrieved = meta.get("retrieved")
    return ParsedDocument(
        title=meta["title"],
        category=meta["category"],
        source_url=url.group(0) if url else None,
        retrieved_at=date.fromisoformat(retrieved) if retrieved else None,
        body=match.group(2).strip(),
    )


def split_long(text: str) -> list[str]:
    """Chia đoạn quá dài theo dòng, giữ nguyên từng dòng."""
    if len(text) <= MAX_CHUNK_CHARS:
        return [text]
    parts, current = [], ""
    for line in text.splitlines():
        if current and len(current) + len(line) + 1 > MAX_CHUNK_CHARS:
            parts.append(current.strip())
            current = ""
        current += line + "\n"
    if current.strip():
        parts.append(current.strip())
    return parts


def split_chunks(document: ParsedDocument) -> list[str]:
    """Mỗi mục ## hoặc ### là một đoạn. Trong FAQ, mỗi cặp hỏi đáp là một đoạn."""
    sections: list[tuple[str, list[str]]] = [("", [])]
    parent = ""
    for line in document.body.splitlines():
        if line.startswith("# "):
            continue
        heading = re.match(r"^(#{2,3}) (.+)$", line)
        question = document.category == "faq" and re.match(r"^\*\*.+\?\*\*$", line)
        if heading:
            name = heading.group(2).strip()
            if len(heading.group(1)) == 2:
                parent = name
                sections.append((name, []))
            else:
                sections.append((f"{parent} > {name}", []))
        elif question:
            sections.append((line.strip("*"), []))
        else:
            sections[-1][1].append(line)

    chunks = []
    for heading, lines in sections:
        content = "\n".join(lines).strip()
        if not content:
            continue
        prefix = f"{document.title} - {heading}" if heading else document.title
        chunks.extend(f"{prefix}\n{part}" for part in split_long(content))
    return chunks


def index_document(db: Session, parsed: ParsedDocument, force: bool = False) -> bool:
    """Index một tài liệu, trả về False nếu nội dung không đổi."""
    document = db.scalar(select(Document).where(Document.title == parsed.title))
    if (
        not force
        and document
        and document.content == parsed.body
        and document.status == DocumentStatus.active
    ):
        return False

    if document is None:
        document = Document(title=parsed.title, category=parsed.category, content=parsed.body)
        db.add(document)
    document.category = parsed.category
    document.source_url = parsed.source_url
    document.retrieved_at = parsed.retrieved_at
    document.content = parsed.body
    document.status = DocumentStatus.active

    chunks = split_chunks(parsed)
    vectors = embedding.embed_passages(chunks)
    plain_vectors = embedding.embed_passages([normalize_vi(chunk) for chunk in chunks])
    # Xóa đoạn cũ trước, nếu không đoạn mới trùng khóa (document_id, chunk_index)
    document.chunks.clear()
    db.flush()
    document.chunks = [
        DocumentChunk(chunk_index=index, text=text, embedding=vector, embedding_plain=plain)
        for index, (text, vector, plain) in enumerate(zip(chunks, vectors, plain_vectors))
    ]
    db.flush()
    return True


def index_directory(db: Session, directory: str | None = None, force: bool = False) -> dict:
    """Đồng bộ thư mục vào database. Tài liệu đã xóa khỏi thư mục sẽ được lưu trữ."""
    paths = sorted(Path(directory or settings.knowledge_dir).glob("[0-9]*.md"))
    titles, changed = set(), 0
    for path in paths:
        parsed = parse_markdown(path.read_text(encoding="utf-8"))
        titles.add(parsed.title)
        changed += index_document(db, parsed, force)

    archived = 0
    for document in db.scalars(
        select(Document).where(
            Document.status == DocumentStatus.active, Document.title.not_in(titles)
        )
    ):
        document.status = DocumentStatus.archived
        archived += 1
    db.commit()
    return {"files": len(paths), "changed": changed, "archived": archived}


def search_docs(db: Session, query: str, top_k: int | None = None) -> list[dict]:
    """Tìm đoạn tài liệu liên quan. Danh sách rỗng nghĩa là kho không có thông tin (BR-31)."""
    # NFR-07: câu không dấu so với bản không dấu của tài liệu
    if has_diacritics(query):
        column, text = DocumentChunk.embedding, query
    else:
        column, text = DocumentChunk.embedding_plain, normalize_vi(query)
    distance = column.cosine_distance(embedding.embed_query(text))
    rows = db.execute(
        select(DocumentChunk.text, Document.title, Document.source_url, (1 - distance).label("score"))
        .join(Document, DocumentChunk.document_id == Document.id)
        .where(Document.status == DocumentStatus.active)
        .order_by(distance)
        .limit(top_k or settings.search_top_k)
    ).all()
    return [
        {
            "text": row.text,
            "title": row.title,
            "source_url": row.source_url,
            "score": round(row.score, 4),
        }
        for row in rows
        if row.score >= settings.search_min_score
    ]
