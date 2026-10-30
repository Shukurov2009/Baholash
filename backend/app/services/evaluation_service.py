"""Baholash mantiqi: tekshiruvlar, anonim saqlash va statistika."""
import secrets
import string
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..models import Evaluation, EvaluationComment, Question, Student, StudentVote, Teacher

MAX_SCORE = 5
LOW_SCORE = 3  # shu balldan PAST bo'lsa izoh majburiy
MIN_COMMENT_LEN = 5
ALERT_MONTHS = 3
APP_TZ = timezone(timedelta(hours=5))  # O'zbekiston (yozgi vaqt yo'q)


def now_period() -> tuple[int, int]:
    n = datetime.now(APP_TZ)
    return n.year, n.month


def month_index(year: int, month: int) -> int:
    return year * 12 + month


# ---------------------------------------------------------------- savollar
def effective_questions(db: Session, school_id: int) -> list[Question]:
    """Maktabning o'z savollari bo'lsa — o'sha; bo'lmasa umumiy savollar."""
    base = select(Question).where(Question.is_active.is_(True)).order_by(Question.order, Question.id)
    own = list(db.scalars(base.where(Question.school_id == school_id)))
    return own or list(db.scalars(base.where(Question.school_id.is_(None))))


# ---------------------------------------------------------------- baholash
def student_has_voted(db: Session, student_id: int, year: int, month: int) -> bool:
    vote = db.scalar(select(StudentVote.id).where(
        StudentVote.student_id == student_id, StudentVote.year == year, StudentVote.month == month))
    ev = db.scalar(select(Evaluation.id).where(
        Evaluation.student_id == student_id, Evaluation.year == year, Evaluation.month == month))
    return vote is not None or ev is not None


def new_anon_code() -> str:
    # O'quvchi ma'lumotlaridan HOSIL QILINMAYDI — to'liq tasodifiy.
    return f"{secrets.choice(string.ascii_uppercase)}-{secrets.randbelow(9000) + 1000}"


def create_evaluation(db: Session, student: Student, data) -> None:
    year, month = now_period()
    teacher = db.get(Teacher, data.teacher_id)
    if not teacher or teacher.school_id != student.school_id:
        raise HTTPException(404, "O'qituvchi topilmadi")
    if student_has_voted(db, student.id, year, month):
        raise HTTPException(409, "Bu oy siz allaqachon baho bergansiz (oyiga faqat bitta o'qituvchiga)")

    questions = effective_questions(db, student.school_id)
    if not questions:
        raise HTTPException(400, "So'rovnoma savollari sozlanmagan")
    ids = {q.id for q in questions}
    if set(data.scores) != ids:
        raise HTTPException(400, "Barcha savollarga javob bering")
    if any(not (1 <= s <= MAX_SCORE) for s in data.scores.values()):
        raise HTTPException(400, f"Har bir baho 1 dan {MAX_SCORE} gacha bo'lishi kerak")
    if not set(data.comments) <= ids:
        raise HTTPException(400, "Izohda noma'lum savol ko'rsatilgan")

    comments = {qid: (text or "").strip() for qid, text in data.comments.items()}
    for number, q in enumerate(questions, start=1):
        if data.scores[q.id] < LOW_SCORE and len(comments.get(q.id, "")) < MIN_COMMENT_LEN:
            raise HTTPException(
                400, f"{number}-savol: {LOW_SCORE} dan past baho uchun izoh majburiy (kamida {MIN_COMMENT_LEN} belgi)")

    db.add(Evaluation(
        teacher_id=teacher.id, student_id=student.id, month=month, year=year,
        scores={str(k): v for k, v in data.scores.items()},
    ))
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Siz bu o'qituvchini bu oy allaqachon baholagansiz")

    # Izohlar alohida jadvalga, o'quvchi/baholashga bog'lanishsiz yoziladi.
    code = new_anon_code()
    for qid, text in comments.items():
        if text:
            db.add(EvaluationComment(teacher_id=teacher.id, month=month, year=year, question_id=qid,
                                     rating=data.scores[qid], comment_text=text, anon_code=code))
    general = (data.general_comment or "").strip()
    if general:
        db.add(EvaluationComment(teacher_id=teacher.id, month=month, year=year, question_id=None,
                                 rating=None, comment_text=general, anon_code=code))
    db.commit()


def submit_vote(db: Session, student: Student, teacher_id: int) -> None:
    year, month = now_period()
    ev = db.scalar(select(Evaluation.id).where(
        Evaluation.student_id == student.id, Evaluation.teacher_id == teacher_id,
        Evaluation.year == year, Evaluation.month == month))
    if ev is None:
        raise HTTPException(400, "Avval so'rovnomani to'ldiring")
    exists = db.scalar(select(StudentVote.id).where(
        StudentVote.student_id == student.id, StudentVote.year == year, StudentVote.month == month))
    if exists is None:  # takroriy chaqiruv xavfsiz (idempotent)
        db.add(StudentVote(student_id=student.id, month=month, year=year))
        db.commit()


# ---------------------------------------------------------------- statistika
def eval_mean(scores: dict) -> Optional[float]:
    vals = list(scores.values())
    return sum(vals) / len(vals) if vals else None


def overall_avg(evals: list[Evaluation]) -> Optional[float]:
    means = [m for m in (eval_mean(e.scores) for e in evals) if m is not None]
    return round(sum(means) / len(means), 2) if means else None


def monthly_series(evals: list[Evaluation]) -> list[dict]:
    buckets: dict[tuple[int, int], list[float]] = defaultdict(list)
    for e in evals:
        m = eval_mean(e.scores)
        if m is not None:
            buckets[(e.year, e.month)].append(m)
    return [
        {"year": y, "month": mo, "label": f"{y}-{mo:02d}", "avg": round(sum(v) / len(v), 2), "count": len(v)}
        for (y, mo), v in sorted(buckets.items())
    ]


def is_alert(series: list[dict]) -> bool:
    """Ketma-ket 3 oy o'rtacha 3 dan past (va oxirgi oy hozirgiga yaqin) bo'lsa — True."""
    if len(series) < ALERT_MONTHS:
        return False
    last = series[-ALERT_MONTHS:]
    idx = [month_index(p["year"], p["month"]) for p in last]
    consecutive = all(b - a == 1 for a, b in zip(idx, idx[1:]))
    year, month = now_period()
    recent = month_index(year, month) - idx[-1] <= 1
    return consecutive and recent and all(p["avg"] < LOW_SCORE for p in last)


def trend_of(series: list[dict]) -> Optional[dict]:
    if len(series) < 2:
        return None
    delta = round(series[-1]["avg"] - series[-2]["avg"], 2)
    return {"direction": "up" if delta > 0.05 else "down" if delta < -0.05 else "flat", "delta": delta}


def status_of(series: list[dict], avg: Optional[float]) -> str:
    if avg is None:
        return "no_data"
    if is_alert(series):
        return "critical"  # qizil
    return "good" if avg >= 4 else "average"  # yashil / sariq


def distribution(evals: list[Evaluation]) -> dict[str, int]:
    dist = {str(i): 0 for i in range(1, MAX_SCORE + 1)}
    for e in evals:
        for v in e.scores.values():
            dist[str(v)] = dist.get(str(v), 0) + 1
    return dist


def question_stats(db: Session, evals: list[Evaluation]) -> list[dict]:
    sums: dict[int, list[int]] = defaultdict(list)
    for e in evals:
        for k, v in e.scores.items():
            sums[int(k)].append(v)
    if not sums:
        return []
    qs = {q.id: q for q in db.scalars(select(Question).where(Question.id.in_(list(sums))))}
    out = [
        {"question_id": qid, "text": qs[qid].text if qid in qs else f"Savol #{qid}",
         "order": qs[qid].order if qid in qs else 0, "avg": round(sum(v) / len(v), 2)}
        for qid, v in sums.items()
    ]
    out.sort(key=lambda x: (x["order"], x["question_id"]))
    return out


def teacher_stats(db: Session, teacher: Teacher) -> dict:
    evals = list(db.scalars(select(Evaluation).where(Evaluation.teacher_id == teacher.id)))
    series = monthly_series(evals)
    avg = overall_avg(evals)
    return {"evals": evals, "series": series, "avg": avg, "responses": len(evals),
            "trend": trend_of(series), "status": status_of(series, avg)}
