"""Namunaviy (FAQAT SINOV) ma'lumotlar: 3 maktab, 15 o'qituvchi, 60 o'quvchi, savollar va baholar.

Ishga tushirish (backend papkasida):  python seed.py
Diqqat: mavjud ma'lumotlar o'chirilib, qaytadan yaratiladi.
"""
import random
from datetime import timedelta

from app import models as m
from app.config import settings
from app.database import Base, SessionLocal, engine
from app.security import hash_password
from app.services.evaluation_service import new_anon_code, now_period
from app.services.bootstrap import ensure_admin

random.seed(7)

QUESTIONS = [
    "O'qituvchi darsni tushunarli tushuntiradimi?",
    "O'qituvchi darsga puxta tayyorlanib keladimi?",
    "O'qituvchi o'quvchilarga hurmat bilan munosabatda bo'ladimi?",
    "O'qituvchi savollarga sabr bilan javob beradimi?",
    "Baholash adolatli va xolisona bo'ladimi?",
    "Dars qiziqarli va foydali o'tadimi?",
    "O'qituvchi dars vaqtini to'g'ri taqsimlaydimi?",
]
SUBJECTS = ["Matematika", "Fizika", "Kimyo", "Biologiya", "Ona tili", "Adabiyot", "Tarix", "Geografiya",
            "Ingliz tili", "Informatika", "Jismoniy tarbiya", "Nemis tili", "Rus tili", "Algebra", "Geometriya"]
FIRST_M = ["Aziz", "Bobur", "Jasur", "Sardor", "Dilshod", "Otabek", "Rustam", "Akmal", "Sherzod", "Ulug'bek"]
FIRST_F = ["Malika", "Dilnoza", "Zilola", "Nodira", "Madina", "Gulnora", "Shahnoza", "Feruza", "Lola", "Sevara"]
LAST = ["Karimov", "Rahimov", "Tursunov", "Aliyev", "Yusupov", "Nazarov", "Ergashev", "Qodirov", "Sobirov", "Hamidov"]
LOW_COMMENTS = ["Dars juda tez o'tadi, tushunmayman", "Savol berganda xafa bo'ladi", "Baholash adolatsiz tuyuladi",
                "Darsga tayyorgarlik kam ko'rinadi", "Mavzu yetarlicha tushuntirilmaydi"]
HIGH_COMMENTS = ["Juda yaxshi o'qituvchi", "Darslari qiziqarli", "Hamma narsani tushunarli tushuntiradi"]


def full_name(female: bool) -> str:
    last = random.choice(LAST)
    if female:
        return f"{random.choice(FIRST_F)} {last[:-2] if last.endswith('ov') else last}a"
    return f"{random.choice(FIRST_M)} {last}"


def main() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    year, month = now_period()
    now = m.utcnow()

    qs = [m.Question(school_id=None, text=t, order=i + 1) for i, t in enumerate(QUESTIONS)]
    db.add_all(qs)
    db.flush()

    teacher_no = 0
    for si in range(3):
        n = si + 1
        # 1-2-maktab: ruxsat ochiq; 3-maktab: yopiq (ruxsat berishni sinash uchun)
        school = m.School(name=f"{n}-sonli maktab", access_enabled=si < 2,
                          access_until=(now + timedelta(days=365)) if si == 0 else None,
                          paid_amount=[1_000_000, 500_000, None][si])
        db.add(school)
        db.flush()

        db.add(m.User(full_name=f"Direktor {n}", email="director@school.uz" if si == 0 else f"director{n}@school.uz",
                      role=m.ROLE_DIRECTOR, school_id=school.id, password_hash=hash_password("123456")))

        teachers = []
        for ti in range(5):
            teacher_no += 1
            name = full_name(ti % 2 == 1)
            u = m.User(full_name=name, username=f"teacher{teacher_no}", role=m.ROLE_TEACHER, school_id=school.id,
                       password_hash=hash_password("123456"))
            db.add(u)
            db.flush()
            t = m.Teacher(full_name=name, subject=SUBJECTS[teacher_no - 1], school_id=school.id, user_id=u.id)
            db.add(t)
            teachers.append(t)
        db.flush()

        students = []
        for k in range(20):
            uname = f"{10 + n}-{101 + k}"  # masalan 11-101
            name = full_name(k % 2 == 0)
            u = m.User(full_name=name, username=uname, role=m.ROLE_STUDENT, school_id=school.id,
                       password_hash=hash_password("123456"))
            db.add(u)
            db.flush()
            s = m.Student(full_name=name, username=uname, grade=5 + k % 7, school_id=school.id, user_id=u.id)
            db.add(s)
            students.append(s)
        db.flush()

        # O'tgan 4 oyning baholari. 1-maktabning 1-o'qituvchisi ketma-ket past (ogohlantirish ko'rinishi uchun).
        for back in range(4, 0, -1):
            y, mo = year, month - back
            while mo < 1:
                y, mo = y - 1, mo + 12
            for ti, t in enumerate(teachers):
                base = 2.3 if (si == 0 and ti == 0 and back <= 3) else random.choice([3.6, 4.1, 4.4, 4.7])
                for s in random.sample(students, 4):
                    scores = {str(q.id): max(1, min(5, round(random.gauss(base, 0.6)))) for q in qs}
                    db.add(m.Evaluation(teacher_id=t.id, student_id=None, month=mo, year=y, scores=scores))
                    code = new_anon_code()
                    for q in qs:
                        sc = int(scores[str(q.id)])
                        if sc < 3:
                            db.add(m.EvaluationComment(teacher_id=t.id, month=mo, year=y, question_id=q.id, rating=sc,
                                                       comment_text=random.choice(LOW_COMMENTS), anon_code=code))
                    if base > 4 and random.random() < 0.5:
                        db.add(m.EvaluationComment(teacher_id=t.id, month=mo, year=y, question_id=None, rating=None,
                                                   comment_text=random.choice(HIGH_COMMENTS), anon_code=code))
        # Bu oy: ba'zi o'quvchilar baho bergan (qatnashuv foizi ko'rinishi uchun).
        for s in students[:8]:
            # Ogohlantirish namunasi buzilmasligi uchun 1-maktabning past baholi o'qituvchisi bu oy tanlanmaydi.
            t = random.choice(teachers[1:] if si == 0 else teachers)
            scores = {str(q.id): random.choice([3, 4, 4, 5, 5]) for q in qs}
            db.add(m.Evaluation(teacher_id=t.id, student_id=s.id, month=month, year=year, scores=scores))
            db.add(m.StudentVote(student_id=s.id, month=month, year=year))

    db.commit()
    admin_password = ensure_admin(db)  # super admin: tasodifiy murakkab parol
    db.close()
    print("Tayyor! FAQAT SINOV uchun namunaviy hisoblar (parol 123456) — haqiqiy maktabda seed.py ishlatmang.")
    if admin_password:
        print(f"  Super admin : {settings.ADMIN_EMAIL}  parol: {admin_password}   (hozir yozib oling)")
    print("  Direktor    : director@school.uz / 123456   (director2@school.uz, director3@school.uz ham bor)")
    print("  O'qituvchi  : teacher1 / 123456  (teacher1..teacher15)")
    print("  O'quvchi    : 11-101 / 123456  (11-101..11-120, 12-101.., 13-101..)")


if __name__ == "__main__":
    main()
