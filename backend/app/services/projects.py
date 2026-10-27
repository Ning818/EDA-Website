"""Funded projects: the one place that adds a project, corrects one, ends one, and writes the funded-projects sentence of a theme page. The admin routes (app/internal/projects.py and
themes.py) call it, and so could a script. It checks who may do what, validates every field and writes the audit row in the same transaction as the change.

Rules kept here, so that no way in can skip them:
- Everything here needs the grant `projects` (the funded-projects owner), for every theme.
- A project is never deleted: when it is over it is marked ended, and it stays in the ended list. A wrong entry is corrected.
- A project is in one theme, and is ongoing or ended; both can be corrected, and the project then goes last in the list it joins (the pages keep each list in the order of `position`).
- The words are plain text and the address an http(s) one (app/core/validation.py).
- The sentence of a theme page about its projects (`themes.funded_blurb`) is written by hand, by this owner; nothing writes it from the projects.
"""
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.validation import InvalidInput, clean_text, clean_url
from app.models.grant import Area
from app.models.theme import Project, ProjectStatus, Theme
from app.models.user import User
from app.services import audit
from app.services.grants import require

CODE_MAX = 50
DESCRIPTION_MAX = 300
BLURB_MAX = 600


class ProjectNotFound(LookupError):
    pass


class ThemeNotFound(LookupError):
    pass


def _theme_by_slug(db: Session, slug: str | None, field: str = "theme") -> Theme:
    theme = db.scalar(select(Theme).where(Theme.slug == (slug or "")))
    if theme is None:
        raise InvalidInput(field, "That theme does not exist.")
    return theme


def snapshot(project: Project) -> dict:
    """What the audit log keeps of a project."""
    return {"theme": project.theme.slug, "status": project.status, "code": project.code, "description": project.description, "url": project.url}


# --- reading ----------------------------------------------------------------------------------------------------------------------------------------------------------


def list_projects(db: Session, actor: User) -> list[Project]:
    """Every project of every theme, in the order of the site: by theme, ongoing before ended, then as each list is kept."""
    require(db, actor, Area.PROJECTS)
    statement = (
        select(Project)
        .join(Theme)
        .options(joinedload(Project.theme))
        .order_by(Theme.position, Project.status.desc(), Project.position, Project.id)  # "ongoing" sorts after "ended", so descending puts it first
    )
    return list(db.scalars(statement).unique())


def get_project(db: Session, actor: User, project_id: int) -> Project:
    require(db, actor, Area.PROJECTS)
    project = db.get(Project, project_id)
    if project is None:
        raise ProjectNotFound(project_id)
    return project


# --- writing ----------------------------------------------------------------------------------------------------------------------------------------------------------


def _status(value: str | None) -> str:
    try:
        return ProjectStatus(value).value
    except ValueError:
        raise InvalidInput("status", "The status must be ongoing or ended.") from None


def _end_of_list(db: Session, theme_id: int, status: str) -> int:
    last = db.scalar(select(func.max(Project.position)).where(Project.theme_id == theme_id, Project.status == status))
    return 0 if last is None else last + 1


def _clean(fields: dict, partial: bool) -> dict:
    """The fields that were given, checked and ready to put on a project. `partial`: only the ones present are looked at. An empty code or address clears it."""
    clean: dict = {}
    if "theme" in fields or not partial:
        clean["theme"] = fields.get("theme")
    if "status" in fields or not partial:
        clean["status"] = _status(fields.get("status", ProjectStatus.ONGOING.value))
    if "code" in fields:
        clean["code"] = clean_text(fields["code"], "code", label="The code", max_length=CODE_MAX)
    if "description" in fields or not partial:
        clean["description"] = clean_text(fields.get("description"), "description", label="The description", max_length=DESCRIPTION_MAX, required=True)
    if "url" in fields:
        clean["url"] = clean_url(fields["url"], "url", label="The address")
    return clean


def add_project(db: Session, actor: User, fields: dict) -> Project:
    """Add a project: `theme` (its slug), `description`, and if wanted `status` (ongoing unless said), `code` and `url`. It goes last in its list."""
    require(db, actor, Area.PROJECTS)
    clean = _clean(fields, partial=False)
    theme = _theme_by_slug(db, clean.pop("theme"))
    project = Project(theme_id=theme.id, position=_end_of_list(db, theme.id, clean["status"]), **clean)
    db.add(project)
    db.flush()
    audit.record(db, actor, "project.add", "project", str(project.id), after=snapshot(project))
    db.commit()
    return project


def update_project(db: Session, actor: User, project_id: int, fields: dict) -> Project:
    """Correct a project: only the fields given change (a code or an address given empty is removed). Ending it is a change of `status` to ended."""
    project = get_project(db, actor, project_id)
    clean = _clean(fields, partial=True)
    theme = _theme_by_slug(db, clean.pop("theme")) if "theme" in clean else project.theme
    before = snapshot(project)
    moves = theme.id != project.theme_id or ("status" in clean and clean["status"] != project.status)
    for key, value in clean.items():
        setattr(project, key, value)
    if theme.id != project.theme_id:
        project.theme = theme
    if moves:
        project.position = _end_of_list(db, theme.id, project.status)
    db.flush()
    after = snapshot(project)
    if after == before:
        db.rollback()  # nothing changed: nothing to keep, and no row in the log
        return project
    audit.record(db, actor, "project.end" if before["status"] == "ongoing" and after["status"] == "ended" else "project.update", "project", str(project.id), before=before, after=after)
    db.commit()
    return project


def set_funded_blurb(db: Session, actor: User, theme_slug: str, text: str | None) -> Theme:
    """Write the sentence of a theme's Funded projects card about its own projects (for example "Ongoing projects include R2POWER300 and R3POWERUP, which work on ...")."""
    require(db, actor, Area.PROJECTS)
    theme = db.scalar(select(Theme).where(Theme.slug == theme_slug))
    if theme is None:
        raise ThemeNotFound(theme_slug)
    clean = clean_text(text, "text", label="The text", max_length=BLURB_MAX, required=True)
    before = theme.funded_blurb
    if clean == before:
        return theme
    theme.funded_blurb = clean
    audit.record(db, actor, "theme.funded_blurb", "theme", theme.slug, before={"funded_blurb": before}, after={"funded_blurb": clean})
    db.commit()
    return theme
