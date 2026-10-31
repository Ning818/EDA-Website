"""What the developer looks at: the activity log (who changed what, and when) and how the system is doing. The admin's routes (app/internal/system.py) call it. Both need the grant `system`
(the preset `developer`), and both only read: nothing here changes anything.

Rules kept here:
- The log is read newest first, a page at a time (`limit` at most 200), by the id of the last row seen, so that a row written while someone is reading cannot shift the next page.
  It can be narrowed to the actions that start with a word ("person." for everything done to people) and to the users whose email contains a word; neither is ever read as a pattern, so a
  "%" typed in the filter matches a "%" and nothing else.
- The status never changes anything and never fails because one part of it is down: a database that cannot answer is reported as such.
- A link check that has not run for `link_check_stale_days` days, or never, is called stale: the check is run by the host's scheduler (python -m app.manage check-links), and nothing else
  would notice that the scheduler stopped.
"""
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.audit import AuditLog
from app.models.collaboration import Collaborator, JointProject
from app.models.grant import Area
from app.models.link import LinkCheck
from app.models.person import Person
from app.models.request import HelpRequest
from app.models.theme import Project, Theme
from app.models.user import User
from app.services import links as link_service
from app.services.grants import require

PAGE_MAX = 200


@dataclass
class AuditPage:
    entries: list[AuditLog]
    # the id to ask for the next, older page with (none: this was the last page)
    next_before: int | None
    # every action the log holds, for a filter to offer
    actions: list[str]


def audit_page(db: Session, actor: User, limit: int = 50, before: int | None = None, action: str | None = None, user: str | None = None) -> AuditPage:
    require(db, actor, Area.SYSTEM)
    limit = max(1, min(int(limit), PAGE_MAX))
    statement = select(AuditLog).order_by(AuditLog.id.desc())
    if before is not None:
        statement = statement.where(AuditLog.id < before)
    if action and action.strip():
        statement = statement.where(AuditLog.action.startswith(action.strip(), autoescape=True))
    if user and user.strip():
        statement = statement.where(AuditLog.user_email.icontains(user.strip(), autoescape=True))
    rows = list(db.scalars(statement.limit(limit + 1)))
    more = len(rows) > limit
    rows = rows[:limit]
    actions = list(db.scalars(select(AuditLog.action).distinct().order_by(AuditLog.action)))
    return AuditPage(entries=rows, next_before=rows[-1].id if more and rows else None, actions=actions)


def _media_size(folder: Path) -> tuple[int, int]:
    files = size = 0
    if folder.exists():
        for file in folder.rglob("*"):
            if file.is_file():
                files += 1
                size += file.stat().st_size
    return files, size


def link_status(db: Session, now: datetime | None = None) -> dict:
    now = now or datetime.now(UTC)
    last = link_service.last_check(db)
    counts = dict(db.execute(select(LinkCheck.state, func.count()).group_by(LinkCheck.state)).all())
    reported = db.scalar(select(func.count()).where(LinkCheck.state == link_service.BROKEN, LinkCheck.failures >= settings.link_fail_threshold)) or 0
    stale = last is None or now - last > timedelta(days=settings.link_check_stale_days)
    return {
        "last_check": last,
        "stale": stale,
        "stale_after_days": settings.link_check_stale_days,
        "total": sum(counts.values()),
        "ok": counts.get(link_service.OK, 0),
        "broken": counts.get(link_service.BROKEN, 0),
        "blocked": counts.get(link_service.BLOCKED, 0),
        "unchecked": counts.get(link_service.UNCHECKED, 0),
        "reported": reported,
        "threshold": settings.link_fail_threshold,
    }


def status(db: Session, actor: User, now: datetime | None = None) -> dict:
    require(db, actor, Area.SYSTEM)
    now = now or datetime.now(UTC)
    try:
        migration = db.scalar(text("SELECT version_num FROM alembic_version"))
        database = {"ok": True, "migration": migration}
    except Exception:  # the status must still come, saying what is wrong
        db.rollback()
        database = {"ok": False, "migration": None}
    files, size = _media_size(settings.media_dir)
    count = lambda model, *where: db.scalar(select(func.count()).select_from(model).where(*where)) or 0  # noqa: E731
    return {
        "server_time": now,
        "database": database,
        "links": link_status(db, now),
        "media": {"files": files, "bytes": size},
        "accounts": {
            "total": count(User),
            "active": count(User, User.is_active.is_(True)),
            "on_temporary_password": count(User, User.must_change_password.is_(True)),
        },
        "requests_open": count(HelpRequest, HelpRequest.status == "open"),
        "content": {
            "people": count(Person),
            "themes": count(Theme),
            "projects": count(Project),
            "collaborators": count(Collaborator),
            "joint_projects": count(JointProject),
        },
    }
