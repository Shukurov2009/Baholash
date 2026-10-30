"""Super admin endpoint'lari: maktablar, litsenziyalar, statistika."""
import secrets
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_role
from ..models import ROLE_ADMIN, ROLE_DIRECTOR, License, School, Student, Teacher, User
from ..schemas import DirectorCreate, LicenseCreate, SchoolCreate
from ..security import hash_password
from ..services.license_service import PLAN_PRICES, PLANS, generate_key, license_info, license_status

router = APIRouter(prefix="/admin", tags=["admin"])
admin_only = require_role(ROLE_ADMIN)


def _school_row(db: Session, s: School) -> dict:
    lic: Optional[License] = db.get(License, s.license_id) if s.license_id else None
    return {
        "id": s.id, "name": s.name,
        "teachers_count": db.scalar(select(func.count(Teacher.id)).where(Teacher.school_id == s.id)) or 0,
        "students_count": db.scalar(select(func.count(Student.id)).where(Student.school_id == s.id)) or 0,
        "license": license_info(lic, with_key=True),
    }


@router.get("/schools")
def schools(_: User = Depends(admin_only), db: Session = Depends(get_db)):
    return [_school_row(db, s) for s in db.scalars(select(School).order_by(School.id))]


@router.post("/schools", status_code=201)
def create_school(data: SchoolCreate, _: User = Depends(admin_only), db: Session = Depends(get_db)):
    if data.license_id is not None:
        lic = db.get(License, data.license_id)
        if not lic:
            raise HTTPException(404, "Litsenziya topilmadi")
        if db.scalar(select(School.id).where(School.license_id == lic.id)):
            raise HTTPException(409, "Bu litsenziya boshqa maktabga biriktirilgan")
    school = School(name=data.name.strip(), license_id=data.license_id)
    db.add(school)
    db.flush()
    password = None
    if data.director_email:  # maktab bilan birga direktor hisobini ham ochish mumkin
        email = data.director_email.strip().lower()
        if db.scalar(select(User.id).where(func.lower(User.email) == email)):
            raise HTTPException(409, "Bu email band")
        password = data.director_password or "".join(secrets.choice("abcdefghjkmnpqrstuvwxyz23456789") for _ in range(8))
        db.add(User(full_name=data.director_name or "Direktor", email=email, role=ROLE_DIRECTOR,
                    school_id=school.id, password_hash=hash_password(password)))
    db.commit()
    return {"school": _school_row(db, school), "director_email": data.director_email, "director_password": password}


@router.get("/licenses")
def licenses(_: User = Depends(admin_only), db: Session = Depends(get_db)):
    out = []
    for lic in db.scalars(select(License).order_by(License.id.desc())):
        school = db.scalar(select(School).where(School.license_id == lic.id))
        out.append({**license_info(lic, with_key=True), "duration_days": lic.duration_days,
                    "school_name": school.name if school else None})
    return out


@router.post("/licenses", status_code=201)
def create_license(data: LicenseCreate, _: User = Depends(admin_only), db: Session = Depends(get_db)):
    if data.plan not in PLANS:
        raise HTTPException(400, f"Tarif quyidagilardan biri bo'lishi kerak: {', '.join(PLANS)}")
    school = None
    if data.school_id is not None:
        school = db.get(School, data.school_id)
        if not school:
            raise HTTPException(404, "Maktab topilmadi")
        if school.license_id:
            raise HTTPException(409, "Bu maktabda allaqachon litsenziya bor")
    lic = License(key=generate_key(), plan=data.plan, duration_days=data.duration_days,
                  school_name=school.name if school else None)
    db.add(lic)
    db.flush()
    if school:
        school.license_id = lic.id
    db.commit()
    return {**license_info(lic, with_key=True), "duration_days": lic.duration_days}


@router.get("/stats")
def stats(_: User = Depends(admin_only), db: Session = Depends(get_db)):
    all_licenses = list(db.scalars(select(License)))
    # Tushum: faollashtirilgan (to'langan) litsenziyalar tarif narxlari yig'indisi.
    paid = [lic for lic in all_licenses if lic.activated_at is not None]
    return {
        "schools_count": db.scalar(select(func.count(School.id))) or 0,
        "directors_count": db.scalar(select(func.count(User.id)).where(User.role == ROLE_DIRECTOR)) or 0,
        "teachers_count": db.scalar(select(func.count(Teacher.id))) or 0,
        "students_count": db.scalar(select(func.count(Student.id))) or 0,
        "licenses_total": len(all_licenses),
        "active_licenses": sum(1 for lic in all_licenses if license_status(lic) == "active"),
        "revenue": sum(PLAN_PRICES.get(lic.plan, 0) for lic in paid),
        "currency": "UZS",
    }


# ---------------------------------------------------------------- direktorlar
# Direktor hisobini FAQAT super admin yaratadi (ro'yxatdan o'tish orqali direktor bo'lib bo'lmaydi).
def _director_row(db: Session, u: User) -> dict:
    school = db.get(School, u.school_id) if u.school_id else None
    return {"id": u.id, "full_name": u.full_name, "email": u.email, "school_id": u.school_id,
            "school_name": school.name if school else None}


@router.get("/directors")
def directors(_: User = Depends(admin_only), db: Session = Depends(get_db)):
    rows = db.scalars(select(User).where(User.role == ROLE_DIRECTOR).order_by(User.full_name))
    return [_director_row(db, u) for u in rows]


@router.post("/directors", status_code=201)
def create_director(data: DirectorCreate, _: User = Depends(admin_only), db: Session = Depends(get_db)):
    if not db.get(School, data.school_id):
        raise HTTPException(404, "Maktab topilmadi")
    email = data.email.strip().lower()
    if db.scalar(select(User.id).where(func.lower(User.email) == email)):
        raise HTTPException(409, "Bu email band")
    generated = None
    password = data.password
    if not password:
        password = generated = secrets.token_urlsafe(9)
    if len(password.encode("utf-8")) > 72:
        raise HTTPException(400, "Parol juda uzun")
    user = User(full_name=data.full_name.strip(), email=email, role=ROLE_DIRECTOR, school_id=data.school_id,
                password_hash=hash_password(password))
    db.add(user)
    db.commit()
    return {"director": _director_row(db, user), "email": email, "password": generated}


@router.delete("/directors/{user_id}", status_code=204)
def delete_director(user_id: int, _: User = Depends(admin_only), db: Session = Depends(get_db)):
    u = db.get(User, user_id)
    if not u or u.role != ROLE_DIRECTOR:
        raise HTTPException(404, "Direktor topilmadi")
    db.delete(u)
    db.commit()
