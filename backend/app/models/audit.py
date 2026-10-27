from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AuditLog(Base):
    """Who changed what, and when. A row is written in the same transaction as the change it describes (app/services/audit.py), so there is never a change without its row,
    nor a row for a change that was rolled back. Never holds a password or its hash; a photo is its path."""

    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    # the user is kept by id and by email: the row stays readable after the account is gone
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    user_email: Mapped[str] = mapped_column(String(254))
    # e.g. "person.add", "person.update", "person.leave"
    action: Mapped[str] = mapped_column(String(60), index=True)
    entity_type: Mapped[str] = mapped_column(String(40))
    # how the thing is addressed, e.g. a person's slug
    entity_key: Mapped[str] = mapped_column(String(200))
    before: Mapped[dict | None] = mapped_column(JSONB)
    after: Mapped[dict | None] = mapped_column(JSONB)
