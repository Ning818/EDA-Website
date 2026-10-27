from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    """A person who can log in to edit the site. There is no sign-up: the accounts are made by the administrative staff (the admin app, later) or by the developer
    (`python -m app.manage create-user`). What a user may do is decided by their grants (app/models/grant.py), not by a role."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    # lower case, the way it is looked up
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(150))
    # an Argon2id hash; the password itself is never stored
    password_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # a session started before this has ended: changing the password logs the user out everywhere
    password_changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    grants: Mapped[list["UserGrant"]] = relationship(back_populates="user", cascade="all, delete-orphan", order_by="UserGrant.id")  # noqa: F821


class LoginAttempt(Base):
    """The failed logins for an email. Kept for any email that is tried, one that has an account or not, so a refusal tells nothing about which accounts exist."""

    __tablename__ = "login_attempts"

    email: Mapped[str] = mapped_column(String(254), primary_key=True)
    failures: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
