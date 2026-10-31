"""Sozlamalar: hammasi .env yoki muhit o'zgaruvchilaridan o'qiladi."""
import os

from dotenv import load_dotenv

load_dotenv()


def _db_url() -> str:
    """Neon/Supabase bergan 'postgres://...' yoki 'postgresql://...' manzilini SQLAlchemy + psycopg2 ko'rinishiga o'tkazadi."""
    url = os.getenv("DATABASE_URL", "sqlite:///./baholash.db").strip()
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg2://" + url[len("postgresql://"):]
    return url


class Settings:
    DATABASE_URL: str = _db_url()
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-ozgartiring")
    ALGORITHM: str = "HS256"
    TOKEN_EXPIRE_DAYS: int = int(os.getenv("TOKEN_EXPIRE_DAYS", "7"))
    CORS_ORIGINS: list[str] = [
        o.strip()
        for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
        if o.strip()
    ]
    # Super admin: parol berilmasa, birinchi ishga tushishda tasodifiy murakkab parol yaratiladi.
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@baholash.uz").strip().lower()
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "")
    # Ishlab chiqishda jadvallar avtomatik yaratiladi; productionda Alembic ishlating.
    AUTO_CREATE_TABLES: bool = os.getenv("AUTO_CREATE_TABLES", "true").lower() == "true"


settings = Settings()
