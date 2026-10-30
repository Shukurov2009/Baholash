"""Super admin parolini yangilaydi (yoki admin yo'q bo'lsa yaratadi) va yangi parolni bir marta chiqaradi.

Ishga tushirish (backend papkasida):  python reset_admin.py
"""
import secrets

from sqlalchemy import select

from app import models as m
from app.config import settings
from app.database import Base, SessionLocal, engine
from app.security import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()
password = settings.ADMIN_PASSWORD or secrets.token_urlsafe(18)
admin = db.scalar(select(m.User).where(m.User.role == m.ROLE_ADMIN))
if admin:
    admin.password_hash = hash_password(password)
    admin.email = settings.ADMIN_EMAIL
else:
    db.add(m.User(full_name="Super Admin", email=settings.ADMIN_EMAIL, role=m.ROLE_ADMIN,
                  password_hash=hash_password(password)))
db.commit()
print(f"Super admin:  {settings.ADMIN_EMAIL}\nParol:        {password}\nParolni hozir yozib oling, qayta ko'rsatilmaydi.")
