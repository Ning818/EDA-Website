from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Parent of every table model (app/models); Alembic reads its metadata to write the migrations."""
