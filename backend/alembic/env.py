"""Alembic muhiti: ulanish manzili va modellar ilovadan olinadi.

Yangi migratsiya:  alembic revision --autogenerate -m "izoh"
Qo'llash:          alembic upgrade head
(Alembic ishlatsangiz, .env da AUTO_CREATE_TABLES=false qiling.)
"""
from alembic import context
from sqlalchemy import engine_from_config, pool

from app import models  # noqa: F401
from app.config import settings
from app.database import Base

config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(url=settings.DATABASE_URL, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = engine_from_config(config.get_section(config.config_ini_section), prefix="sqlalchemy.",
                                poolclass=pool.NullPool)
    with engine.connect() as conn:
        # render_as_batch: SQLite'da ham ustun o'zgartirish migratsiyalari ishlashi uchun.
        context.configure(connection=conn, target_metadata=target_metadata, render_as_batch=True)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
