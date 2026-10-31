"""FastAPI ilovasi: ishga tushirish — uvicorn app.main:app --reload"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import models  # noqa: F401  (jadvallar Base'ga ro'yxatdan o'tishi uchun)
from .config import settings
from .database import Base, SessionLocal, engine
from .services.bootstrap import ensure_admin, init_db
from .routers import admin, auth, director, evaluations, student, teacher


@asynccontextmanager
async def lifespan(_: FastAPI):
    generated = None
    try:
        if settings.AUTO_CREATE_TABLES:
            init_db(engine, Base)
        with SessionLocal() as db:
            generated = ensure_admin(db)
    except Exception:  # baza ulanmasa ham ilova ishga tushsin; xato /api/health/db da ko'rinadi
        import traceback
        traceback.print_exc()
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


@app.get("/api/health/db")
def health_db():
    """Baza ulanishini tekshiradi (xato matnini ko'rsatadi, parolni emas)."""
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        # Admin holati (faqat ha/yo'q; parol va email ko'rsatilmaydi).
        from sqlalchemy import select
        from .models import ROLE_ADMIN, User
        from .security import verify_password
        with SessionLocal() as db:
            admins = list(db.scalars(select(User).where(User.role == ROLE_ADMIN)))
            admin = admins[0] if admins else None
            return {
                "db": "ok", "kind": engine.dialect.name,
                "admin_count": len(admins),
                "env_password_set": bool(settings.ADMIN_PASSWORD),
                "admin_email_matches_env": bool(admin and admin.email == settings.ADMIN_EMAIL),
                "admin_password_matches_env": bool(
                    admin and settings.ADMIN_PASSWORD and verify_password(settings.ADMIN_PASSWORD, admin.password_hash)),
            }
    except Exception as e:
        return JSONResponse(status_code=500, content={"db": "xato", "kind": engine.dialect.name, "error": str(e).splitlines()[0][:300]})
