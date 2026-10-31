"""Ishga tushirish: jadvallar, eski bazaga yangi ustunlar, super admin."""
import secrets
from typing import Optional

from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from ..config import settings
from ..models import ROLE_ADMIN, User
from ..security import hash_password
from sqlalchemy import select


def _add_missing_columns(engine) -> None:
    """Alembic yo'q: eski bazada yetishmayotgan ustunlarni qo'shadi (bir marta, xavfsiz)."""
    insp = inspect(engine)
    if "schools" not in insp.get_table_names():
        return
    have = {c["name"] for c in insp.get_columns("schools")}
    sqlite = engine.dialect.name == "sqlite"
    wanted = {
        "access_enabled": "BOOLEAN NOT NULL DEFAULT 0" if sqlite else "BOOLEAN NOT NULL DEFAULT FALSE",
        "access_until": "TIMESTAMP",
        "paid_amount": "INTEGER",
    }
    with engine.begin() as conn:
        for name, ddl in wanted.items():
            if name not in have:
                conn.execute(text(f"ALTER TABLE schools ADD COLUMN {name} {ddl}"))


def init_db(engine, base) -> None:
    base.metadata.create_all(bind=engine)
    _add_missing_columns(engine)


def ensure_admin(db: Session) -> Optional[str]:
    """Super admin yo'q bo'lsa yaratadi. Parol tasodifiy yaratilgan bo'lsa — uni qaytaradi (bir marta ko'rsatish uchun)."""
    if db.scalar(select(User.id).where(User.role == ROLE_ADMIN)):
        return None
    generated = None
    password = settings.ADMIN_PASSWORD
    if not password:
        password = generated = secrets.token_urlsafe(18)  # ~24 belgi, tasodifiy
    db.add(User(full_name="Super Admin", email=settings.ADMIN_EMAIL, role=ROLE_ADMIN,
                password_hash=hash_password(password)))
    db.commit()
    return generated
