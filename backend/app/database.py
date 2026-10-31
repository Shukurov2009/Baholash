"""SQLAlchemy ulanishi. Bitta modellar to'plami ham SQLite, ham PostgreSQL bilan ishlaydi."""
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

# SQLite faqat bitta oqimda ishlashga ruxsat beradi — FastAPI uchun buni o'chiramiz.
_connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

# Vercel (serverless) da har so'rov alohida ishga tushishi mumkin, shuning uchun Postgresda ulanishlarni
# o'zimizda saqlab o'tirmaymiz (NullPool): baza provayderi (Neon) o'zi ulanishlarni boshqaradi.
if settings.DATABASE_URL.startswith("sqlite"):
    engine = create_engine(settings.DATABASE_URL, connect_args=_connect_args)
else:
    engine = create_engine(settings.DATABASE_URL, poolclass=NullPool, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
