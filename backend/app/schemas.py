"""Pydantic sxemalari (so'rov/javob)."""
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class LoginIn(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: str = Field(min_length=1)
    role: Optional[str] = None  # login sahifasi roli: noto'g'ri sahifadan kirishni to'xtatadi


class UserOut(BaseModel):
    id: int
    full_name: str
    role: str
    username: Optional[str] = None
    email: Optional[str] = None
    school_id: Optional[int] = None
    school_name: Optional[str] = None


class TokenOut(BaseModel):
    token: str
    user: UserOut


class EvaluationIn(BaseModel):
    teacher_id: int
    scores: dict[int, int]  # {savol_id: 1..5}
    comments: dict[int, str] = {}  # {savol_id: izoh}
    general_comment: str = ""


class SubmitIn(BaseModel):
    teacher_id: int


class PersonCreate(BaseModel):
    full_name: str = Field(min_length=3, max_length=200)
    subject: Optional[str] = Field(default=None, max_length=120)  # faqat o'qituvchi uchun
    grade: Optional[int] = Field(default=None, ge=5, le=11)  # faqat o'quvchi uchun
    username: Optional[str] = Field(default=None, min_length=3, max_length=80)
    password: Optional[str] = Field(default=None, min_length=6, max_length=72)


class PersonUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=3, max_length=200)
    subject: Optional[str] = Field(default=None, max_length=120)
    username: Optional[str] = Field(default=None, min_length=3, max_length=80)
    reset_password: bool = False


class QuestionItem(BaseModel):
    id: Optional[int] = None
    text: str = Field(min_length=3, max_length=400)
    is_active: bool = True


class QuestionsIn(BaseModel):
    questions: list[QuestionItem] = Field(max_length=20)


class SchoolCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    open: bool = False  # darrov ruxsat berilsinmi
    days: Optional[int] = Field(default=None, ge=1, le=3650)  # bo'sh = muddatsiz
    paid_amount: Optional[int] = Field(default=None, ge=0, le=10_000_000_000)


class AccessIn(BaseModel):
    enabled: bool
    days: Optional[int] = Field(default=None, ge=1, le=3650)  # enabled bo'lsa: bo'sh = muddatsiz
    paid_amount: Optional[int] = Field(default=None, ge=0, le=10_000_000_000)  # shu safar to'langan summa


class RegisterIn(BaseModel):
    """O'zi ro'yxatdan o'tish. Faqat o'quvchi va o'qituvchi — direktor/admin bu yo'ldan yaratilmaydi."""
    role: Literal["STUDENT", "TEACHER"]
    full_name: str = Field(min_length=3, max_length=200)
    username: str = Field(pattern=r"^[A-Za-z0-9._-]{3,40}$")  # '@' yo'q: email bilan adashmasligi uchun
    password: str = Field(min_length=6, max_length=72)
    school_id: int
    grade: Optional[int] = None  # o'quvchi uchun majburiy (5-11)
    subject: Optional[str] = Field(default=None, max_length=120)  # o'qituvchi uchun majburiy


class ChangePasswordIn(BaseModel):
    old_password: str = Field(min_length=1)
    new_password: str = Field(min_length=6, max_length=72)


class DirectorCreate(BaseModel):
    school_id: int
    full_name: str = Field(min_length=3, max_length=200)
    email: EmailStr
    password: Optional[str] = Field(default=None, min_length=8, max_length=72)
