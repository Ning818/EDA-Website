from collections.abc import Iterator

from sqlalchemy.orm import Session

from app.db.session import SessionLocal


def get_db() -> Iterator[Session]:
    """A database session for one request, closed when the request is done."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
