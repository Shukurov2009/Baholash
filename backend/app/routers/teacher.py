"""O'qituvchi endpoint'lari.

MUHIM: bu yerda izohlar uchun endpoint YO'Q — o'qituvchi izohlarni hech qachon olmaydi.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_role
from ..models import ROLE_TEACHER, Teacher, User
from ..services import evaluation_service as svc

router = APIRouter(prefix="/teacher", tags=["teacher"])
teacher_only = require_role(ROLE_TEACHER)


def current_teacher(db: Session, user: User) -> Teacher:
    teacher = db.scalar(select(Teacher).where(Teacher.user_id == user.id))
    if not teacher:
        raise HTTPException(404, "O'qituvchi profili topilmadi")
    return teacher


@router.get("/summary")
def summary(user: User = Depends(teacher_only), db: Session = Depends(get_db)):
    teacher = current_teacher(db, user)
    st = svc.teacher_stats(db, teacher)
    year, month = svc.now_period()
    this_month = next((p for p in st["series"] if p["year"] == year and p["month"] == month), None)
    return {
        "full_name": teacher.full_name, "subject": teacher.subject,
        "avg": st["avg"], "responses": st["responses"],
        "this_month_avg": this_month["avg"] if this_month else None,
        "this_month_count": this_month["count"] if this_month else 0,
        "questions": svc.question_stats(db, st["evals"]),
        "distribution": svc.distribution(st["evals"]),
    }


@router.get("/trend")
def trend(user: User = Depends(teacher_only), db: Session = Depends(get_db)):
    teacher = current_teacher(db, user)
    return svc.monthly_series(svc.teacher_stats(db, teacher)["evals"])
