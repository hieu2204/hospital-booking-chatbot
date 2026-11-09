from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas import KnowledgeHit
from app.services.knowledge import search_docs

router = APIRouter(prefix="/knowledge", tags=["Kho tri thức"])


@router.get("/search", response_model=list[KnowledgeHit])
def search(q: str = Query(min_length=1), db: Session = Depends(get_db)) -> list[dict]:
    return search_docs(db, q)
