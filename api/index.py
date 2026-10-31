"""Vercel kirish nuqtasi: butun FastAPI backend shu yerdan ishlaydi (serverless funksiya).

Vercel `app` nomli ASGI ilovani topib, /api/* so'rovlarini unga uzatadi (vercel.json dagi rewrites).
"""
import os
import sys
import traceback

# backend/app paketini import qilish uchun yo'l qo'shamiz.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app  # noqa: E402  (modellar ham shu yerda import bo'ladi)
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.services.bootstrap import ensure_admin, init_db  # noqa: E402

# Serverlessda "startup" hodisasiga ishonib bo'lmaydi, shuning uchun jadvallar va super adminni
# funksiya birinchi yuklanganda (cold start) yaratamiz. Takroran ishlasa ham zarar yo'q.
try:
    init_db(engine, Base)  # jadvallar + eski bazaga yangi ustunlar
    with SessionLocal() as db:
        generated = ensure_admin(db)
    if generated:  # ADMIN_PASSWORD berilmagan bo'lsa — parol Vercel loglariga chiqadi
        print(f"SUPER ADMIN parol (faqat hozir): {generated}")
except Exception:  # baza ulanmasa ham ilova ochilsin, xato logda ko'rinsin
    traceback.print_exc()
