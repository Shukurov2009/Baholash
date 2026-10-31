"""Super admin endpoint'lari: maktablar (ruxsat ochish/yopish, o'chirish), direktorlar, statistika."""
import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_role
from ..models import ROLE_ADMIN, ROLE_DIRECTOR, School, Student, Teacher, User
from ..schemas import AccessIn, DirectorCreate, SchoolCreate
from ..security import hash_password
from ..services.access import access_info, access_status, apply_access, delete_school

router = APIRouter(prefix="/admin", tags=["admin"])
admin_only = require_role(ROLE_ADMIN)


def _school_row(db: Session, s: School) -> dict:
    directors = db.scalars(select(User).where(User.role == ROLE_DIRECTOR, User.school_id == s.id).order_by(User.full_name))
    return {
        "id": s.id, "name": s.name,
        "teachers_count": db.scalar(select(func.count(Teacher.id)).where(Teacher.school_id == s.id)) or 0,
        "students_count": db.scalar(select(func.count(Student.id)).where(Student.school_id == s.id)) or 0,
        "directors": [{"full_name": d.full_name, "email": d.email} for d in directors],
        "access": access_info(s),
    }


@router.get("/schools")
def schools(_: User = Depends(admin_only), db: Session = Depends(get_db)):
    return [_school_row(db, s) for s in db.scalars(select(School).order_by(School.id))]


@router.post("/schools", status_code=201)
def create_school(data: SchoolCreate, _: User = Depends(admin_only), db: Session = Depends(get_db)):
    """Maktabni faqat super admin qo'shadi. Odatda yopiq turadi: pul to'langach ruxsat beriladi."""
    school = School(name=data.name.strip())
    apply_access(school, data.open, data.days, data.paid_amount)
    db.add(school)
    db.commit()
    return _school_row(db, school)


@router.put("/schools/{school_id}/access")
def set_access(school_id: int, data: AccessIn, _: User = Depends(admin_only), db: Session = Depends(get_db)):
    """Maktabga ruxsat berish (muddat bilan yoki muddatsiz) yoki yopish."""
    school = db.get(School, school_id)
    if not school:
        raise HTTPException(404, "Maktab topilmadi")
    apply_access(school, data.enabled, data.days, data.paid_amount)
    db.commit()
    return _school_row(db, school)


@router.delete("/schools/{school_id}", status_code=204)
def remove_school(school_id: int, _: User = Depends(admin_only), db: Session = Depends(get_db)):
    """Maktabni va uning direktor, o'qituvchi, o'quvchi, baho, izohlarini butunlay o'chiradi."""
    school = db.get(School, school_id)
    if not school:
        raise HTTPException(404, "Maktab topilmadi")
    delete_school(db, school)


@router.get("/stats")
def stats(_: User = Depends(admin_only), db: Session = Depends(get_db)):
    all_schools = list(db.scalars(select(School)))
    open_count = sum(1 for s in all_schools if access_status(s) == "active")
    return {
        "schools_count": len(all_schools),
        "open_schools": open_count,
        "closed_schools": len(all_schools) - open_count,
        "directors_count": db.scalar(select(func.count(User.id)).where(User.role == ROLE_DIRECTOR)) or 0,
        "teachers_count": db.scalar(select(func.count(Teacher.id))) or 0,
        "students_count": db.scalar(select(func.count(Student.id))) or 0,
        "revenue": sum(s.paid_amount or 0 for s in all_schools),
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
