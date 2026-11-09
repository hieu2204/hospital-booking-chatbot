"""Embedding chạy local bằng ONNX, không mất phí. Mô hình E5 cần tiền tố query/passage."""

from functools import lru_cache

from app.config import settings


@lru_cache
def get_model():
    from fastembed import TextEmbedding

    return TextEmbedding(settings.embedding_model, cache_dir=settings.model_cache_dir)


def embed_passages(texts: list[str]) -> list[list[float]]:
    return [vector.tolist() for vector in get_model().embed([f"passage: {t}" for t in texts])]


def embed_query(text: str) -> list[float]:
    return next(iter(get_model().embed([f"query: {text}"]))).tolist()
