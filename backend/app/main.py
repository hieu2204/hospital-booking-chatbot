import threading
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.routers import (
    admin,
    appointments,
    auth,
    booking_drafts,
    catalog,
    knowledge,
    profiles,
    triage,
)
from app.services import embedding
from app.services.booking import BookingError


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Nạp mô hình embedding ở nền, để câu hỏi đầu tiên không phải chờ khoảng 1 phút
    if settings.preload_embedding:
        threading.Thread(target=embedding.get_model, daemon=True).start()
    yield


app = FastAPI(title="Hệ thống đặt lịch khám và chatbot", lifespan=lifespan)

app.include_router(auth.router)
app.include_router(profiles.router)
app.include_router(catalog.router)
app.include_router(appointments.router)
app.include_router(admin.router)
app.include_router(knowledge.router)
app.include_router(booking_drafts.router)
app.include_router(triage.router)


@app.exception_handler(BookingError)
def handle_booking_error(_: Request, error: BookingError) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code, content={"code": error.code, "message": error.message}
    )


@app.get("/health")
def health(db: Session = Depends(get_db)) -> dict:
    db.execute(text("SELECT 1"))
    return {"status": "ok"}
