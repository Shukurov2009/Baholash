"""Sozlamalar: hammasi .env yoki muhit o'zgaruvchilaridan o'qiladi."""
import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./baholash.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-ozgartiring")
    ALGORITHM: str = "HS256"
    TOKEN_EXPIRE_DAYS: int = int(os.getenv("TOKEN_EXPIRE_DAYS", "7"))
    CORS_ORIGINS: list[str] = [
        o.strip()
        for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
        if o.strip()
    ]
    # Litsenziya tekshiruvi hozircha o'chirilgan (keyin LICENSE_REQUIRED=true qilinadi).
    LICENSE_REQUIRED: bool = os.getenv("LICENSE_REQUIRED", "false").lower() == "true"
    # Super admin: parol berilmasa, birinchi ishga tushishda tasodifiy murakkab parol yaratiladi.
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@baholash.uz").strip().lower()
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "")
    # Ishlab chiqishda jadvallar avtomatik yaratiladi; productionda Alembic ishlating.
    AUTO_CREATE_TABLES: bool = os.getenv("AUTO_CREATE_TABLES", "true").lower() == "true"


settings = Settings()
