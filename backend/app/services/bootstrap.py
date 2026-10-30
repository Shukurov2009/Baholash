"""Birinchi ishga tushirishda super admin hisobini yaratish."""
import secrets
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..models import ROLE_ADMIN, User
from ..security import hash_password


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
