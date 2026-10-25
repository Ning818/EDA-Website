from datetime import datetime
from enum import StrEnum

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Role(StrEnum):
    ADMIN = "admin"  # edits the content and manages the users
    EDITOR = "editor"  # edits the content


class User(Base):
    """A person who can log in to edit the site. There is no sign-up: an admin makes the account (`python -m app.manage create-user`)."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    # lower case, the way it is looked up
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(150))
    # an Argon2id hash; the password itself is never stored
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default=Role.EDITOR)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # a session started before this has ended: changing the password logs the user out everywhere
    password_changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class LoginAttempt(Base):
    """The failed logins for an email. Kept for any email that is tried, one that has an account or not, so a refusal tells nothing about which accounts exist."""

    __tablename__ = "login_attempts"

    email: Mapped[str] = mapped_column(String(254), primary_key=True)
    failures: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
