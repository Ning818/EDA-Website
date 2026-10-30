from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class LinkCheck(Base):
    """One address that the content links to, and what the last checks found. The rows are made from the content (app/services/links.py): a person's links, a collaborator's website, a joint
    project's record, a funded project's website and a highlight card's address. Nothing here is typed by anyone; a row whose address changes or whose source goes is made new or removed at the
    next check."""

    __tablename__ = "link_checks"
    __table_args__ = (UniqueConstraint("source_type", "source_key", "field"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    # where the address is: "person" (key: the slug; field: polito, orcid, linkedin, dept, iris), "collaborator", "joint_project" and "project" (key: the id; field: url), "highlight" (key: "<theme slug>:<kind>")
    source_type: Mapped[str] = mapped_column(String(20))
    source_key: Mapped[str] = mapped_column(String(100))
    field: Mapped[str] = mapped_column(String(30))
    # what a person sees in the list: "Enrico Macii - ORCID"
    label: Mapped[str] = mapped_column(String(400))
    url: Mapped[str] = mapped_column(String(500))
    # who keeps the content, and so sees the problem: "people", "site", "projects" or "theme" (for a theme, which theme)
    area: Mapped[str] = mapped_column(String(20), index=True)
    theme_id: Mapped[int | None] = mapped_column(ForeignKey("themes.id", ondelete="CASCADE"))
    # "unchecked", "ok", "broken" (the last check failed) or "blocked" (the site would not say: it refuses programs, so nothing is known)
    state: Mapped[str] = mapped_column(String(12), default="unchecked")
    # what the last check found, in words, e.g. "404 Not Found"
    detail: Mapped[str | None] = mapped_column(String(200))
    # how many checks in a row failed; a link is reported only after several
    failures: Mapped[int] = mapped_column(Integer, default=0)
    first_failed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
