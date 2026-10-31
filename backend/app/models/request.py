from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class HelpRequest(Base):
    """What someone could not find in the admin and asked for ("I can't find what I need"). The developer reads these and answers; a change that no screen covers is something they build or do, and the answer says so. The asker is kept by id and by name and email, so the row stays readable after the account is gone."""

    __tablename__ = "help_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    user_name: Mapped[str] = mapped_column(String(200))
    user_email: Mapped[str] = mapped_column(String(254))
    message: Mapped[str] = mapped_column(Text)
    # the page of the admin the asker came from, e.g. "/themes/smart-city" (none when they came from nowhere in particular)
    page: Mapped[str | None] = mapped_column(String(200))
    # "open" or "done"
    status: Mapped[str] = mapped_column(String(10), default="open", index=True)
    # what the staff answered when they closed it
    answer: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    handled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    handled_by: Mapped[str | None] = mapped_column(String(254))
