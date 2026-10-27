from datetime import datetime
from enum import StrEnum

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Area(StrEnum):
    """A part of the site's content a user may be given. What a user may do is decided by these grants only (app/services/grants.py)."""

    PEOPLE_ADD = "people_add"  # add a new person to the People list
    PEOPLE_EDIT = "people_edit"  # change any person: title, photo, links; let a person leave
    PEOPLE_DELETE = "people_delete"  # delete a person (for one added by mistake): their rows in every theme go with them
    SITE = "site"  # collaborators and joint projects, the footer's numbers, the intro paragraphs of the People and Collaborations pages
    PROJECTS = "projects"  # the funded projects of every theme, and the funded-projects paragraph of each theme page
    THEME = "theme"  # the content of a theme (its words, research areas, highlights, contacts); `theme_id` says which one, empty means every theme
    ACCOUNTS = "accounts"  # make, switch off and give grants to accounts


class UserGrant(Base):
    __tablename__ = "user_grants"
    __table_args__ = (
        # one row per user, area and theme; NULLS NOT DISTINCT so that "every theme" cannot be granted twice
        UniqueConstraint("user_id", "area", "theme_id", name="uq_user_grants", postgresql_nulls_not_distinct=True),
        CheckConstraint("area = 'theme' OR theme_id IS NULL", name="ck_user_grants_theme_only_for_theme"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    area: Mapped[str] = mapped_column(String(20))
    # only for the area `theme`: the one theme it is about; none means every theme, including the ones added later
    theme_id: Mapped[int | None] = mapped_column(ForeignKey("themes.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="grants")  # noqa: F821
    theme: Mapped["Theme | None"] = relationship()  # noqa: F821
