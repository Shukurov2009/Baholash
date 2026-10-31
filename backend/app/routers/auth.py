"""Kirish, ro'yxatdan o'tish va joriy foydalanuvchi."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import ROLE_ADMIN, ROLE_STUDENT, ROLE_TEACHER, School, Student, Teacher, User
from ..schemas import ChangePasswordIn, LoginIn, RegisterIn, TokenOut, UserOut
from ..services.access import CLOSED_MESSAGE, access_status
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

MIN_GRADE, MAX_GRADE = 5, 11  # 1-4 sinflar platformada ishtirok etmaydi


def user_out(db: Session, user: User) -> UserOut:
    school = db.get(School, user.school_id) if user.school_id else None
    return UserOut(id=user.id, full_name=user.full_name, role=user.role, username=user.username,
                   email=user.email, school_id=user.school_id, school_name=school.name if school else None)


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    ident = (data.username or data.email or "").strip().lower()
    if not ident:
        raise HTTPException(400, "Login yoki email kiriting")
    user = db.scalar(select(User).where(or_(func.lower(User.username) == ident, func.lower(User.email) == ident)))
    # Sabab bir xil xabar bilan yashiriladi: foydalanuvchi mavjudligini oshkor qilmaymiz.
    if not user or not user.is_active or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Login yoki parol noto'g'ri")
    if data.role and data.role != user.role:
        raise HTTPException(401, "Login yoki parol noto'g'ri")
    if user.role != ROLE_ADMIN and access_status(db.get(School, user.school_id) if user.school_id else None) != "active":
        raise HTTPException(403, CLOSED_MESSAGE)
    return TokenOut(token=create_access_token(user.id, user.role), user=user_out(db, user))


@router.get("/schools")
def public_schools(db: Session = Depends(get_db)):
    """Ro'yxatdan o'tish sahifasi uchun ochiq ro'yxat (faqat id va nom). Faqat ruxsat berilgan maktablar."""
    return [{"id": s.id, "name": s.name} for s in db.scalars(select(School).order_by(School.name))
            if access_status(s) == "active"]


@router.post("/register", response_model=TokenOut, status_code=201)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    """O'quvchi yoki o'qituvchi o'zi hisob ochadi. O'qituvchi avtomatik baholash ro'yxatiga qo'shiladi.

    Direktor va super admin bu yerdan YARATILMAYDI: `role` faqat STUDENT/TEACHER bo'la oladi (schemas.RegisterIn).
    """
    school = db.get(School, data.school_id)
    if not school:
        raise HTTPException(404, "Maktab topilmadi")
    if access_status(school) != "active":
        raise HTTPException(403, "Bu maktabga hozircha ruxsat berilmagan")
    if len(data.password.encode("utf-8")) > 72:  # bcrypt chegarasi (belgi emas, bayt)
        raise HTTPException(400, "Parol juda uzun")
    username = data.username.strip().lower()
    if db.scalar(select(User.id).where(func.lower(User.username) == username)):
        raise HTTPException(409, "Bu login band, boshqasini tanlang")

    full_name = " ".join(data.full_name.split())
    if data.role == ROLE_STUDENT:
        if data.grade is None or not (MIN_GRADE <= data.grade <= MAX_GRADE):
            raise HTTPException(400, f"Platforma {MIN_GRADE}-sinfdan {MAX_GRADE}-sinfgacha o'quvchilar uchun")
    elif not (data.subject or "").strip():
        raise HTTPException(400, "Fan nomini kiriting")

    user = User(full_name=full_name, username=username, role=data.role, school_id=school.id,
                password_hash=hash_password(data.password))
    db.add(user)
    try:
        db.flush()
    except IntegrityError:  # ikki kishi bir vaqtda bir xil login olishga urinsa
        db.rollback()
        raise HTTPException(409, "Bu login band, boshqasini tanlang")
    if data.role == ROLE_STUDENT:
        db.add(Student(full_name=full_name, username=username, grade=data.grade, school_id=school.id, user_id=user.id))
    else:
        assert data.role == ROLE_TEACHER
        db.add(Teacher(full_name=full_name, subject=data.subject.strip(), school_id=school.id, user_id=user.id))
    db.commit()
    return TokenOut(token=create_access_token(user.id, user.role), user=user_out(db, user))


@router.post("/change-password")
def change_password(data: ChangePasswordIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(data.old_password, user.password_hash):
        raise HTTPException(400, "Eski parol noto'g'ri")
    if len(data.new_password.encode("utf-8")) > 72:
        raise HTTPException(400, "Parol juda uzun")
    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"ok": True}


@router.post("/me", response_model=UserOut)
@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return user_out(db, user)
