"""Litsenziya tekshiruvi va faollashtirish."""
import uuid
from datetime import timedelta
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import License, School, utcnow

# Tariflar narxi (so'mda) — admin statistikasidagi "tushum" shundan hisoblanadi.
PLAN_PRICES = {"basic": 500_000, "standard": 1_000_000, "premium": 2_000_000}
PLANS = tuple(PLAN_PRICES)


def license_status(lic: Optional[License]) -> str:
    if lic is None:
        return "none"
    if not lic.is_active:
        return "inactive"
    if lic.expires_at and lic.expires_at < utcnow():
        return "expired"
    return "active"


def school_license(db: Session, school_id: Optional[int]) -> Optional[License]:
    school = db.get(School, school_id) if school_id else None
    return db.get(License, school.license_id) if school and school.license_id else None


def ensure_school_license_active(db: Session, school_id: Optional[int]) -> None:
    if license_status(school_license(db, school_id)) != "active":
        raise HTTPException(403, "Maktab litsenziyasi faol emas. Direktor litsenziyani faollashtirishi kerak.")


def license_info(lic: Optional[License], with_key: bool = False) -> dict:
    info = {
        "status": license_status(lic),
        "plan": lic.plan if lic else None,
        "expires_at": lic.expires_at.isoformat() if lic and lic.expires_at else None,
        "activated_at": lic.activated_at.isoformat() if lic and lic.activated_at else None,
    }
    if with_key and lic:
        info["key"] = lic.key
        info["id"] = lic.id
    return info


def generate_key() -> str:
    return str(uuid.uuid4()).upper()


def activate_license(db: Session, school: School, key: str) -> License:
    lic = db.scalar(select(License).where(License.key == key.strip().upper()))
    if not lic:
        raise HTTPException(404, "Bunday litsenziya kaliti topilmadi")
    other = db.scalar(select(School).where(School.license_id == lic.id, School.id != school.id))
    if other:
        raise HTTPException(409, "Bu kalit boshqa maktabga biriktirilgan")
    now = utcnow()
    lic.is_active = True
    lic.activated_at = now
    lic.expires_at = now + timedelta(days=lic.duration_days)
    school.license_id = lic.id
    db.commit()
    return lic
