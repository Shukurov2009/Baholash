"""FastAPI ilovasi: ishga tushirish — uvicorn app.main:app --reload"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import models  # noqa: F401  (jadvallar Base'ga ro'yxatdan o'tishi uchun)
from .config import settings
from .database import Base, SessionLocal, engine
from .services.bootstrap import ensure_admin
from .routers import admin, auth, director, evaluations, student, teacher


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.AUTO_CREATE_TABLES:
        Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        generated = ensure_admin(db)
    if generated:
        print("=" * 60)
        print(f"SUPER ADMIN yaratildi: {settings.ADMIN_EMAIL}")
        print(f"Parol (faqat hozir ko'rsatiladi): {generated}")
        print("=" * 60)
    yield


app = FastAPI(title="O'qituvchilarni anonim baholash platformasi", lifespan=lifespan)

# Frontend (Vite) boshqa portda ishlaydi — shu uchun CORS kerak.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    # FastAPI odatda 422 qaytaradi; bizning API shartnomasi bo'yicha noto'g'ri ma'lumot = 400.
    errors = [{"loc": [str(p) for p in e["loc"]], "msg": e["msg"]} for e in exc.errors()]
    return JSONResponse(status_code=400, content={"detail": "Ma'lumotlar noto'g'ri kiritilgan", "errors": errors})


for r in (auth, student, teacher, director, admin, evaluations):
    app.include_router(r.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
