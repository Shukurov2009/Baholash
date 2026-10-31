"""Maktabga ruxsat (oddiy "litsenziya"): super admin ochadi/yopadi, ixtiyoriy muddat bilan."""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..models import (ROLE_ADMIN, Evaluation, EvaluationComment, Question, School, Student, StudentVote, Teacher,
                      User, utcnow)

CLOSED_MESSAGE = "Maktabingizga hozircha ruxsat berilmagan yoki muddati tugagan. Direktor bilan bog'laning."


def access_status(school: Optional[School]) -> str:
    """'active' (ochiq), 'expired' (muddati tugagan) yoki 'off' (yopiq)."""
    if school is None or not school.access_enabled:
        return "off"
    if school.access_until and school.access_until < utcnow():
        return "expired"
    return "active"


def access_info(school: School) -> dict:
    until = school.access_until
    days_left = max(0, (until - utcnow()).days + 1) if until and access_status(school) == "active" else None
    return {
        "status": access_status(school),
        "enabled": bool(school.access_enabled),
        "until": until.isoformat() if until else None,
        "days_left": days_left,
        "paid_amount": school.paid_amount or 0,
    }


def ensure_school_open(db: Session, school_id: Optional[int]) -> None:
    school = db.get(School, school_id) if school_id else None
    if access_status(school) != "active":
        raise HTTPException(403, CLOSED_MESSAGE)


def apply_access(school: School, enabled: bool, days: Optional[int], paid: Optional[int]) -> None:
    """enabled=False — yopadi. enabled=True: days=None — muddatsiz, aks holda muddatga qo'shadi."""
    now = utcnow()
    if not enabled:
        school.access_enabled = False
    else:
        was_active = access_status(school) == "active"
        school.access_enabled = True
        if days is None:
            school.access_until = None
        else:
            base: datetime = school.access_until if (was_active and school.access_until) else now
            school.access_until = base + timedelta(days=days)
    if paid:
        school.paid_amount = (school.paid_amount or 0) + paid


def delete_school(db: Session, school: School) -> None:
    """Maktabni va unga tegishli hamma narsani o'chiradi (qaytarib bo'lmaydi)."""
    teacher_ids = select(Teacher.id).where(Teacher.school_id == school.id)
    student_ids = select(Student.id).where(Student.school_id == school.id)
    db.execute(delete(EvaluationComment).where(EvaluationComment.teacher_id.in_(teacher_ids)))
    db.execute(delete(Evaluation).where(Evaluation.teacher_id.in_(teacher_ids)))
    db.execute(delete(StudentVote).where(StudentVote.student_id.in_(student_ids)))
    db.execute(delete(Teacher).where(Teacher.school_id == school.id))
    db.execute(delete(Student).where(Student.school_id == school.id))
    db.execute(delete(User).where(User.school_id == school.id, User.role != ROLE_ADMIN))
    db.execute(delete(Question).where(Question.school_id == school.id))
    db.delete(school)
    db.commit()
