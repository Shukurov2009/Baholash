"""Barcha SQLAlchemy modellari.

ANONIMLIK: EvaluationComment jadvali o'quvchiga HECH QANDAY ustun orqali bog'lanmaydi
(student_id ham, evaluation_id ham yo'q). Shuning uchun izohdan o'quvchini topib bo'lmaydi,
hatto ma'lumotlar bazasiga to'g'ridan-to'g'ri kirilsa ham.
"""
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base

ROLE_DIRECTOR = "DIRECTOR"
ROLE_TEACHER = "TEACHER"
ROLE_STUDENT = "STUDENT"
ROLE_ADMIN = "SUPER_ADMIN"
ALL_ROLES = (ROLE_DIRECTOR, ROLE_TEACHER, ROLE_STUDENT, ROLE_ADMIN)


def utcnow() -> datetime:
    # SQLite timezone saqlamaydi, shuning uchun hamma joyda "naive UTC" ishlatamiz.
    return datetime.now(timezone.utc).replace(tzinfo=None)


class License(Base):
    __tablename__ = "licenses"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    school_name: Mapped[Optional[str]] = mapped_column(String(200))
    plan: Mapped[str] = mapped_column(String(30), default="basic")
    duration_days: Mapped[int] = mapped_column(Integer, default=365)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    activated_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class School(Base):
    __tablename__ = "schools"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    license_id: Mapped[Optional[int]] = mapped_column(ForeignKey("licenses.id"), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(200))
    username: Mapped[Optional[str]] = mapped_column(String(80), unique=True, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(200), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(20), index=True)
    school_id: Mapped[Optional[int]] = mapped_column(ForeignKey("schools.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Teacher(Base):
    __tablename__ = "teachers"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(200))
    subject: Mapped[str] = mapped_column(String(120))
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), index=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(200))
    username: Mapped[str] = mapped_column(String(80))
    grade: Mapped[Optional[int]] = mapped_column(Integer)  # sinf (5-11)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), index=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    # school_id bo'sh (NULL) bo'lsa — savol hamma maktab uchun umumiy.
    school_id: Mapped[Optional[int]] = mapped_column(ForeignKey("schools.id"), index=True)
    text: Mapped[str] = mapped_column(String(400))
    order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Evaluation(Base):
    """Baholar (faqat ballar). student_id faqat qayta baholashni cheklash uchun saqlanadi."""

    __tablename__ = "evaluations"
    __table_args__ = (
        UniqueConstraint("student_id", "teacher_id", "month", "year", name="uq_eval_student_teacher_month"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("teachers.id"), index=True)
    # O'quvchi o'chirilsa NULL bo'ladi — baholar saqlanadi, lekin hech kimga bog'lanmaydi.
    student_id: Mapped[Optional[int]] = mapped_column(ForeignKey("students.id"))
    month: Mapped[int] = mapped_column(Integer)
    year: Mapped[int] = mapped_column(Integer)
    scores: Mapped[dict] = mapped_column(JSON)  # {"savol_id": 1..5}
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class EvaluationComment(Base):
    """Anonim izohlar. O'quvchiga bog'lanish YO'Q (yuqoridagi izohga qarang).

    anon_code — bitta baholashdagi izohlarni guruhlash uchun tasodifiy kod ("A-2479"),
    u o'quvchi ma'lumotlaridan hosil qilinmaydi.
    created_at ataylab yo'q: aniq vaqt izohni baholash bilan bog'lashga yordam berardi.
    """

    __tablename__ = "evaluation_comments"

    id: Mapped[int] = mapped_column(primary_key=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("teachers.id"), index=True)
    month: Mapped[int] = mapped_column(Integer)
    year: Mapped[int] = mapped_column(Integer)
    question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("questions.id"))  # NULL = umumiy izoh
    rating: Mapped[Optional[int]] = mapped_column(Integer)
    comment_text: Mapped[str] = mapped_column(Text)
    anon_code: Mapped[str] = mapped_column(String(12))


class StudentVote(Base):
    """Oyiga bir marta ovoz berganini belgilaydi (kimga berganini emas)."""

    __tablename__ = "student_votes"
    __table_args__ = (UniqueConstraint("student_id", "month", "year", name="uq_vote_student_month"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    month: Mapped[int] = mapped_column(Integer)
    year: Mapped[int] = mapped_column(Integer)
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
