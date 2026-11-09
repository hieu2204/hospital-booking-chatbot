from dataclasses import asdict

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas import EmergencyCheckIn, EmergencyCheckOut, SuggestOut
from app.services.safety import check_message
from app.services.triage import suggest_departments

router = APIRouter(prefix="/triage", tags=["Sàng lọc"])


@router.post("/emergency-check", response_model=EmergencyCheckOut)
def emergency_check(body: EmergencyCheckIn) -> dict:
    return asdict(check_message(body.message))


@router.get("/suggest-department", response_model=SuggestOut)
def suggest(symptoms: str = Query(min_length=1), db: Session = Depends(get_db)) -> dict:
    return suggest_departments(db, symptoms)
