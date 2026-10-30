"""O'quvchi endpoint'lari."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_role
from ..models import ROLE_STUDENT, Student, Teacher, User
from ..schemas import EvaluationIn, SubmitIn
from ..services import evaluation_service as svc

router = APIRouter(prefix="/student", tags=["student"])
student_only = require_role(ROLE_STUDENT)


def current_student(db: Session, user: User) -> Student:
    student = db.scalar(select(Student).where(Student.user_id == user.id))
    if not student:
        raise HTTPException(404, "O'quvchi profili topilmadi")
    return student


@router.get("/teachers")
def teachers(user: User = Depends(student_only), db: Session = Depends(get_db)):
    student = current_student(db, user)
    rows = db.scalars(select(Teacher).where(Teacher.school_id == student.school_id).order_by(Teacher.full_name))
    return [{"id": t.id, "full_name": t.full_name, "subject": t.subject} for t in rows]  # rasm yo'q


@router.get("/questions")
def questions(user: User = Depends(student_only), db: Session = Depends(get_db)):
    student = current_student(db, user)
    return [{"id": q.id, "text": q.text, "order": q.order} for q in svc.effective_questions(db, student.school_id)]


@router.get("/vote-status")
def vote_status(user: User = Depends(student_only), db: Session = Depends(get_db)):
    student = current_student(db, user)
    year, month = svc.now_period()
    return {"voted": svc.student_has_voted(db, student.id, year, month), "year": year, "month": month}


@router.post("/evaluations", status_code=201)
def create_evaluation(data: EvaluationIn, user: User = Depends(student_only), db: Session = Depends(get_db)):
    svc.create_evaluation(db, current_student(db, user), data)
    return {"ok": True}


@router.post("/submit")
def submit(data: SubmitIn, user: User = Depends(student_only), db: Session = Depends(get_db)):
    svc.submit_vote(db, current_student(db, user), data.teacher_id)
    return {"ok": True}
