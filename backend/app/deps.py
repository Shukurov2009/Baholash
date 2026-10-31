"""Autentifikatsiya va rol tekshiruvi uchun dependency'lar."""
from typing import Optional

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import ROLE_ADMIN, User
from .services.access import ensure_school_open

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise HTTPException(401, "Avtorizatsiya talab qilinadi")
    try:
        payload = decode_or_401(creds.credentials)
        user = db.get(User, int(payload["sub"]))
    except (KeyError, ValueError):
        raise HTTPException(401, "Token yaroqsiz")
    if not user or not user.is_active:
        raise HTTPException(401, "Foydalanuvchi topilmadi yoki o'chirilgan")
    return user


def decode_or_401(token: str) -> dict:
    from .security import decode_token

    try:
        return decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token muddati tugagan, qaytadan kiring")
    except jwt.PyJWTError:
        raise HTTPException(401, "Token yaroqsiz")


def require_role(*roles: str):
    """Rolni tekshiradi (403). Maktab foydalanuvchilari uchun maktabga ruxsat (ochiq/yopiq) ham tekshiriladi."""

    def checker(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
        if user.role not in roles:
            raise HTTPException(403, "Bu amal uchun ruxsat yo'q")
        if user.role != ROLE_ADMIN:
            ensure_school_open(db, user.school_id)
        return user

    return checker
