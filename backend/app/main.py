from fastapi import Depends, FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import get_db
from app.routers import admin, appointments, auth, catalog, profiles
from app.services.booking import BookingError

app = FastAPI(title="Hệ thống đặt lịch khám và chatbot")

app.include_router(auth.router)
app.include_router(profiles.router)
app.include_router(catalog.router)
app.include_router(appointments.router)
app.include_router(admin.router)


@app.exception_handler(BookingError)
def handle_booking_error(_: Request, error: BookingError) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code, content={"code": error.code, "message": error.message}
    )


@app.get("/health")
def health(db: Session = Depends(get_db)) -> dict:
    db.execute(text("SELECT 1"))
    return {"status": "ok"}
