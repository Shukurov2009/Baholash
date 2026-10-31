"""Direktor endpoint'lari."""
import csv
import io
import secrets
import string
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_role
from ..models import (ROLE_DIRECTOR, ROLE_STUDENT, ROLE_TEACHER, Evaluation, EvaluationComment, Question,
                      School, Student, StudentVote, Teacher, User)
from ..schemas import PersonCreate, PersonUpdate, QuestionsIn
from ..security import hash_password
from ..services import evaluation_service as svc

router = APIRouter(prefix="/director", tags=["director"])
director_only = require_role(ROLE_DIRECTOR)

MONTHS_UZ = ["", "yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr",
             "noyabr", "dekabr"]
STATUS_UZ = {"good": "Yaxshi", "average": "O'rtacha", "critical": "Ogohlantirish", "no_data": "Ma'lumot yo'q"}


# ---------------------------------------------------------------- yordamchilar
def _password() -> str:
    alphabet = "abcdefghjkmnpqrstuvwxyz23456789"  # adashtiriladigan harflarsiz (0/o, 1/l)
    return "".join(secrets.choice(alphabet) for _ in range(8))


def _free_username(db: Session, prefix: str) -> str:
    while True:
        name = f"{prefix}{secrets.randbelow(90000) + 10000}"
        if not db.scalar(select(User.id).where(func.lower(User.username) == name)):
            return name


def _make_user(db: Session, school_id: int, full_name: str, role: str, username: Optional[str],
               password: Optional[str], prefix: str) -> tuple[User, Optional[str]]:
    """Foydalanuvchi yaratadi. Parol o'zimiz yaratgan bo'lsa — bir martalik qaytaramiz."""
    username = (username or "").strip().lower() or _free_username(db, prefix)
    if db.scalar(select(User.id).where(func.lower(User.username) == username)):
        raise HTTPException(409, "Bu login band, boshqasini tanlang")
    generated = None if password else _password()
    user = User(full_name=full_name.strip(), username=username, role=role, school_id=school_id,
                password_hash=hash_password(password or generated))
    db.add(user)
    db.flush()
    return user, generated


def _teacher_or_404(db: Session, user: User, teacher_id: int) -> Teacher:
    t = db.get(Teacher, teacher_id)
    if not t or t.school_id != user.school_id:
        raise HTTPException(404, "O'qituvchi topilmadi")
    return t


def _student_or_404(db: Session, user: User, student_id: int) -> Student:
    s = db.get(Student, student_id)
    if not s or s.school_id != user.school_id:
        raise HTTPException(404, "O'quvchi topilmadi")
    return s


def _teacher_row(db: Session, t: Teacher) -> dict:
    st = svc.teacher_stats(db, t)
    login = db.get(User, t.user_id) if t.user_id else None
    return {"id": t.id, "full_name": t.full_name, "subject": t.subject, "username": login.username if login else None,
            "avg": st["avg"], "responses": st["responses"], "trend": st["trend"], "status": st["status"]}


def _school_teachers(db: Session, school_id: int) -> list[Teacher]:
    return list(db.scalars(select(Teacher).where(Teacher.school_id == school_id).order_by(Teacher.full_name)))


# ---------------------------------------------------------------- umumiy ko'rinish
@router.get("/overview")
def overview(user: User = Depends(director_only), db: Session = Depends(get_db)):
    year, month = svc.now_period()
    teachers = _school_teachers(db, user.school_id)
    students_count = db.scalar(select(func.count(Student.id)).where(Student.school_id == user.school_id)) or 0
    voted = db.scalar(
        select(func.count(func.distinct(Evaluation.student_id)))
        .join(Student, Student.id == Evaluation.student_id)
        .where(Student.school_id == user.school_id, Evaluation.year == year, Evaluation.month == month)) or 0
    evals = list(db.scalars(
        select(Evaluation).join(Teacher, Teacher.id == Evaluation.teacher_id).where(Teacher.school_id == user.school_id)))
    return {
        "teachers_count": len(teachers), "students_count": students_count, "voted_count": voted,
        "participation": round(voted / students_count * 100) if students_count else 0,
        "overall_avg": svc.overall_avg(evals), "year": year, "month": month, "month_name": MONTHS_UZ[month],
    }


@router.get("/teachers")
def teachers_list(user: User = Depends(director_only), db: Session = Depends(get_db)):
    return [_teacher_row(db, t) for t in _school_teachers(db, user.school_id)]


@router.get("/teachers/{teacher_id}")
def teacher_detail(teacher_id: int, user: User = Depends(director_only), db: Session = Depends(get_db)):
    t = _teacher_or_404(db, user, teacher_id)
    st = svc.teacher_stats(db, t)
    return {"id": t.id, "full_name": t.full_name, "subject": t.subject, "avg": st["avg"], "responses": st["responses"],
            "status": st["status"], "questions": svc.question_stats(db, st["evals"]),
            "distribution": svc.distribution(st["evals"]), "series": st["series"]}


@router.get("/teachers/{teacher_id}/comments")
def teacher_comments(teacher_id: int, user: User = Depends(director_only), db: Session = Depends(get_db)):
    """Izohlar ismsiz: faqat tasodifiy kod ("O'quvchi #A-2479") bilan."""
    t = _teacher_or_404(db, user, teacher_id)
    rows = db.execute(
        select(EvaluationComment, Question.text)
        .outerjoin(Question, Question.id == EvaluationComment.question_id)
        .where(EvaluationComment.teacher_id == t.id)
        .order_by(EvaluationComment.year.desc(), EvaluationComment.month.desc(), EvaluationComment.anon_code,
                  EvaluationComment.id)).all()
    return [{"code": f"O'quvchi #{c.anon_code}", "question": q, "rating": c.rating, "text": c.comment_text,
             "year": c.year, "month": c.month} for c, q in rows]


@router.get("/alerts")
def alerts(user: User = Depends(director_only), db: Session = Depends(get_db)):
    out = []
    for t in _school_teachers(db, user.school_id):
        series = svc.teacher_stats(db, t)["series"]
        if svc.is_alert(series):
            out.append({"teacher_id": t.id, "full_name": t.full_name, "subject": t.subject,
                        "months": series[-svc.ALERT_MONTHS:]})
    return out


@router.get("/export")
def export_csv(user: User = Depends(director_only), db: Session = Depends(get_db)):
    questions = svc.effective_questions(db, user.school_id)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["O'qituvchi", "Fan", "O'rtacha baho", "Javoblar soni", "Holat"] + [q.text for q in questions])
    for t in _school_teachers(db, user.school_id):
        st = svc.teacher_stats(db, t)
        per_q = {q["question_id"]: q["avg"] for q in svc.question_stats(db, st["evals"])}
        w.writerow([t.full_name, t.subject, st["avg"] if st["avg"] is not None else "", st["responses"],
                    STATUS_UZ[st["status"]]] + [per_q.get(q.id, "") for q in questions])
    # BOM — Excel o'zbekcha harflarni to'g'ri ochishi uchun.
    return Response("﻿" + buf.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": 'attachment; filename="hisobot.csv"'})


# ---------------------------------------------------------------- o'qituvchilar CRUD
@router.post("/teachers", status_code=201)
def create_teacher(data: PersonCreate, user: User = Depends(director_only), db: Session = Depends(get_db)):
    if not (data.subject or "").strip():
        raise HTTPException(400, "Fan nomini kiriting")
    login, generated = _make_user(db, user.school_id, data.full_name, ROLE_TEACHER, data.username, data.password, "t")
    t = Teacher(full_name=data.full_name.strip(), subject=data.subject.strip(), school_id=user.school_id, user_id=login.id)
    db.add(t)
    db.commit()
    return {"teacher": _teacher_row(db, t), "username": login.username, "password": generated}


@router.put("/teachers/{teacher_id}")
def update_teacher(teacher_id: int, data: PersonUpdate, user: User = Depends(director_only),
                   db: Session = Depends(get_db)):
    t = _teacher_or_404(db, user, teacher_id)
    login = db.get(User, t.user_id) if t.user_id else None
    if data.full_name:
        t.full_name = data.full_name.strip()
        if login:
            login.full_name = t.full_name
    if data.subject:
        t.subject = data.subject.strip()
    password = None
    if data.reset_password and login:
        password = _password()
        login.password_hash = hash_password(password)
    db.commit()
    return {"teacher": _teacher_row(db, t), "password": password}


@router.delete("/teachers/{teacher_id}", status_code=204)
def delete_teacher(teacher_id: int, user: User = Depends(director_only), db: Session = Depends(get_db)):
    t = _teacher_or_404(db, user, teacher_id)
    db.execute(delete(EvaluationComment).where(EvaluationComment.teacher_id == t.id))
    db.execute(delete(Evaluation).where(Evaluation.teacher_id == t.id))
    user_id = t.user_id
    db.delete(t)
    db.flush()
    if user_id:
        db.execute(delete(User).where(User.id == user_id))
    db.commit()


# ---------------------------------------------------------------- o'quvchilar CRUD
@router.get("/students")
def students_list(user: User = Depends(director_only), db: Session = Depends(get_db)):
    rows = db.scalars(select(Student).where(Student.school_id == user.school_id).order_by(Student.username))
    return [{"id": s.id, "full_name": s.full_name, "username": s.username, "grade": s.grade} for s in rows]


@router.post("/students", status_code=201)
def create_student(data: PersonCreate, user: User = Depends(director_only), db: Session = Depends(get_db)):
    login, generated = _make_user(db, user.school_id, data.full_name, ROLE_STUDENT, data.username, data.password, "s")
    s = Student(full_name=data.full_name.strip(), username=login.username, grade=data.grade,
                school_id=user.school_id, user_id=login.id)
    db.add(s)
    db.commit()
    return {"student": {"id": s.id, "full_name": s.full_name, "username": s.username, "grade": s.grade},
            "username": login.username, "password": generated}


@router.put("/students/{student_id}")
def update_student(student_id: int, data: PersonUpdate, user: User = Depends(director_only),
                   db: Session = Depends(get_db)):
    s = _student_or_404(db, user, student_id)
    login = db.get(User, s.user_id) if s.user_id else None
    if data.full_name:
        s.full_name = data.full_name.strip()
        if login:
            login.full_name = s.full_name
    password = None
    if data.reset_password and login:  # parolni direktor generatsiya qiladi
        password = _password()
        login.password_hash = hash_password(password)
    db.commit()
    return {"student": {"id": s.id, "full_name": s.full_name, "username": s.username}, "password": password}


@router.delete("/students/{student_id}", status_code=204)
def delete_student(student_id: int, user: User = Depends(director_only), db: Session = Depends(get_db)):
    s = _student_or_404(db, user, student_id)
    # Baholar saqlanadi, lekin o'quvchiga endi hech qanday bog'lanmaydi.
    db.execute(update(Evaluation).where(Evaluation.student_id == s.id).values(student_id=None))
    db.execute(delete(StudentVote).where(StudentVote.student_id == s.id))
    user_id = s.user_id
    db.delete(s)
    db.flush()
    if user_id:
        db.execute(delete(User).where(User.id == user_id))
    db.commit()


# ---------------------------------------------------------------- savollar
@router.get("/questions")
def get_questions(user: User = Depends(director_only), db: Session = Depends(get_db)):
    own = list(db.scalars(select(Question).where(Question.school_id == user.school_id, Question.is_active.is_(True))
                          .order_by(Question.order, Question.id)))
    if own:
        rows, custom = own, True
    else:
        rows = list(db.scalars(select(Question).where(Question.school_id.is_(None), Question.is_active.is_(True))
                               .order_by(Question.order, Question.id)))
        custom = False
    return {"custom": custom, "questions": [{"id": q.id, "text": q.text, "is_active": q.is_active} for q in rows]}


@router.put("/questions")
def put_questions(data: QuestionsIn, user: User = Depends(director_only), db: Session = Depends(get_db)):
    if not any(q.is_active for q in data.questions):
        raise HTTPException(400, "Kamida bitta faol savol bo'lishi kerak")
    own = {q.id: q for q in db.scalars(select(Question).where(Question.school_id == user.school_id))}
    seen: set[int] = set()
    for position, item in enumerate(data.questions, start=1):
        existing = own.get(item.id) if item.id else None
        if existing:
            existing.text, existing.order, existing.is_active = item.text.strip(), position, item.is_active
            seen.add(existing.id)
        else:  # umumiy savol tahrirlansa ham — maktab uchun yangi nusxa yaratiladi
            db.add(Question(school_id=user.school_id, text=item.text.strip(), order=position, is_active=item.is_active))
    # Olib tashlanganlar o'chirilmaydi, faqat o'chiriladi (eski baholarning savol matni saqlanib qolsin).
    for qid, q in own.items():
        if qid not in seen:
            q.is_active = False
    db.commit()
    return get_questions(user, db)
