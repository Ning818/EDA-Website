"""Collaborations: the one place that adds, corrects and removes the collaborators of the logo walls and the joint projects of the Collaborations page. The admin routes
(app/internal/collaborators.py and joint_projects.py) call it, and so could a script. It checks who may do what, validates every field, looks after the logo file and writes the audit row
in the same transaction as the change.

Rules kept here, so that no way in can skip them:
- Everything here needs the grant `site` (the administrative staff).
- A collaborator is in one of the three walls (university, institute, company) and goes last in its wall; one whose kind is corrected goes last in the new wall. A wall cannot hold two
  with the same name (capitals do not count).
- A logo is checked by its content, made smaller, stripped of what is not the picture and stored under a name made here; SVG is refused (app/services/photos.py). It is optional.
  The file goes with the collaborator, and a replaced logo is removed.
- A joint project is a record from CORDIS: a code (which no other has), a name, who funds it, the years, who coordinated it and the address of its record; its other partners are the
  names as the record gives them, which need not be collaborators. It goes last in the list.
- The words are plain text and the addresses http(s) ones (app/core/validation.py).
- A change that changes nothing writes no audit row.
"""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.validation import InvalidInput, clean_text, clean_url
from app.models.collaboration import Collaborator, CollaboratorKind, JointProject
from app.models.grant import Area
from app.models.user import User
from app.services import audit, photos
from app.services.grants import require
from app.services.people import slugify

LOGO_FOLDER = "collaborators"
LOGO_MAX_SIDE = 600  # a logo is shown small; a bigger one is only a heavier download
NAME_MAX = 200
JOINT_NAME_MAX = 300
JOINT_CODE_MAX = 50
FUNDING_MAX = 100
YEARS_MAX = 20
PARTNERS_MAX = 40

# the walls in the order of the page
KINDS = [CollaboratorKind.UNIVERSITY.value, CollaboratorKind.INSTITUTE.value, CollaboratorKind.COMPANY.value]


class CollaboratorNotFound(LookupError):
    pass


class JointProjectNotFound(LookupError):
    pass


class NameTaken(Exception):
    """A collaborator of this name is in the wall already."""


class CodeTaken(Exception):
    """A joint project with this code is in the list already."""


# --- collaborators ----------------------------------------------------------------------------------------------------------------------------------------------------


def collaborator_snapshot(collaborator: Collaborator) -> dict:
    """What the audit log keeps of a collaborator."""
    return {"kind": collaborator.kind, "name": collaborator.name, "url": collaborator.url, "logo": collaborator.logo}


def list_collaborators(db: Session, actor: User) -> list[Collaborator]:
    """Every collaborator, wall by wall in the order of the page, each wall in its own order."""
    require(db, actor, Area.SITE)
    everyone = db.scalars(select(Collaborator).order_by(Collaborator.position, Collaborator.id)).all()
    return sorted(everyone, key=lambda c: KINDS.index(c.kind))  # stable: within a wall the order stays


def get_collaborator(db: Session, actor: User, collaborator_id: int) -> Collaborator:
    require(db, actor, Area.SITE)
    collaborator = db.get(Collaborator, collaborator_id)
    if collaborator is None:
        raise CollaboratorNotFound(collaborator_id)
    return collaborator


def _kind(value: str | None) -> str:
    try:
        return CollaboratorKind(value).value
    except ValueError:
        raise InvalidInput("kind", "The kind must be university, institute or company.") from None


def _clean_collaborator(fields: dict, partial: bool) -> dict:
    clean: dict = {}
    if "kind" in fields or not partial:
        clean["kind"] = _kind(fields.get("kind"))
    if "name" in fields or not partial:
        clean["name"] = clean_text(fields.get("name"), "name", label="The name", max_length=NAME_MAX, required=True)
    if "url" in fields:
        clean["url"] = clean_url(fields["url"], "url", label="The address")
    return clean


def _prepare_logo(logo: bytes | None) -> tuple[bytes, str] | None:
    return None if logo is None else photos.prepare(logo, max_side=LOGO_MAX_SIDE, what="logo")


def _name_taken(db: Session, kind: str, name: str, except_id: int | None = None) -> bool:
    statement = select(Collaborator.id).where(Collaborator.kind == kind, func.lower(Collaborator.name) == name.lower())
    if except_id is not None:
        statement = statement.where(Collaborator.id != except_id)
    return db.scalar(statement) is not None


def _end_of_wall(db: Session, kind: str) -> int:
    last = db.scalar(select(func.max(Collaborator.position)).where(Collaborator.kind == kind))
    return 0 if last is None else last + 1


def _logo_in_use(db: Session, path: str) -> bool:
    return db.scalar(select(Collaborator.id).where(Collaborator.logo == path)) is not None


def add_collaborator(db: Session, actor: User, fields: dict, logo: bytes | None = None) -> Collaborator:
    """Add a collaborator: `kind`, `name` and, if wanted, `url`; a `logo` is the uploaded file's bytes. It goes last in its wall."""
    require(db, actor, Area.SITE)
    clean = _clean_collaborator(fields, partial=False)
    prepared = _prepare_logo(logo)
    if _name_taken(db, clean["kind"], clean["name"]):
        raise NameTaken
    collaborator = Collaborator(position=_end_of_wall(db, clean["kind"]), **clean)
    path = None
    if prepared:
        path = photos.stored_path(slugify(clean["name"]), prepared[0], prepared[1], LOGO_FOLDER)
        collaborator.logo = path
    try:
        db.add(collaborator)
        db.flush()
        audit.record(db, actor, "collaborator.add", "collaborator", str(collaborator.id), after=collaborator_snapshot(collaborator))
        if prepared:
            photos.write(path, prepared[0], LOGO_FOLDER)
        db.commit()
    except Exception:
        db.rollback()
        if path:
            photos.delete(path, LOGO_FOLDER)
        raise
    return collaborator


def update_collaborator(db: Session, actor: User, collaborator_id: int, fields: dict, logo: bytes | None = None, remove_logo: bool = False) -> Collaborator:
    """Correct a collaborator: only the fields given change (an `url` given empty is removed). A new `logo` replaces the old one; `remove_logo` takes it away."""
    collaborator = get_collaborator(db, actor, collaborator_id)
    clean = _clean_collaborator(fields, partial=True)
    if logo is not None and remove_logo:
        raise InvalidInput("logo", "Choose a new logo or remove the logo, not both.")
    prepared = _prepare_logo(logo)

    kind = clean.get("kind", collaborator.kind)
    name = clean.get("name", collaborator.name)
    if (kind, name.lower()) != (collaborator.kind, collaborator.name.lower()) and _name_taken(db, kind, name, collaborator.id):
        raise NameTaken

    before = collaborator_snapshot(collaborator)
    if kind != collaborator.kind:
        collaborator.position = _end_of_wall(db, kind)
    for key, value in clean.items():
        setattr(collaborator, key, value)
    old_logo, new_path = collaborator.logo, None
    if prepared:
        new_path = photos.stored_path(slugify(name), prepared[0], prepared[1], LOGO_FOLDER)
        collaborator.logo = new_path
    elif remove_logo:
        collaborator.logo = None
    try:
        db.flush()
        after = collaborator_snapshot(collaborator)
        if after == before:
            db.rollback()
            return collaborator
        audit.record(db, actor, "collaborator.update", "collaborator", str(collaborator.id), before=before, after=after)
        if prepared:
            photos.write(new_path, prepared[0], LOGO_FOLDER)
        db.commit()
    except Exception:
        db.rollback()
        if new_path and new_path != old_logo:
            photos.delete(new_path, LOGO_FOLDER)
        raise
    if old_logo and old_logo != collaborator.logo and not _logo_in_use(db, old_logo):
        photos.delete(old_logo, LOGO_FOLDER)
    return collaborator


def delete_collaborator(db: Session, actor: User, collaborator_id: int) -> None:
    """Remove a collaborator, whose collaboration has ended or who was added by mistake. What was kept of them is in the audit log; the logo file goes too."""
    collaborator = get_collaborator(db, actor, collaborator_id)
    logo = collaborator.logo
    audit.record(db, actor, "collaborator.delete", "collaborator", str(collaborator.id), before=collaborator_snapshot(collaborator))
    db.delete(collaborator)
    db.commit()
    if logo and not _logo_in_use(db, logo):
        photos.delete(logo, LOGO_FOLDER)


# --- joint projects ---------------------------------------------------------------------------------------------------------------------------------------------------


def joint_snapshot(project: JointProject) -> dict:
    return {
        "code": project.code,
        "name": project.name,
        "funding": project.funding,
        "years": project.years,
        "coordinator": project.coordinator,
        "partners": list(project.partners or []),
        "url": project.url,
    }


def list_joint_projects(db: Session, actor: User) -> list[JointProject]:
    require(db, actor, Area.SITE)
    return list(db.scalars(select(JointProject).order_by(JointProject.position, JointProject.id)))


def get_joint_project(db: Session, actor: User, project_id: int) -> JointProject:
    require(db, actor, Area.SITE)
    project = db.get(JointProject, project_id)
    if project is None:
        raise JointProjectNotFound(project_id)
    return project


def _clean_partners(value) -> list[str]:
    if not isinstance(value, (list, tuple)):
        raise InvalidInput("partners", "The partners must be a list of names.")
    names = [clean_text(item, "partners", label="A partner's name", max_length=NAME_MAX) for item in value]
    names = [name for name in names if name]
    if len(names) > PARTNERS_MAX:
        raise InvalidInput("partners", f"There can be at most {PARTNERS_MAX} partners.")
    return names


def _clean_joint(fields: dict, partial: bool) -> dict:
    clean: dict = {}
    texts = (("code", "The code", JOINT_CODE_MAX), ("name", "The name", JOINT_NAME_MAX), ("funding", "The funding", FUNDING_MAX), ("years", "The years", YEARS_MAX), ("coordinator", "The coordinator", NAME_MAX))
    for key, label, limit in texts:
        if key in fields or not partial:
            clean[key] = clean_text(fields.get(key), key, label=label, max_length=limit, required=True)
    if "partners" in fields or not partial:
        clean["partners"] = _clean_partners(fields.get("partners") or [])
    if "url" in fields or not partial:
        url = clean_url(fields.get("url"), "url", label="The address")
        if url is None:
            raise InvalidInput("url", "The address is required.")
        clean["url"] = url
    return clean


def _code_taken(db: Session, code: str, except_id: int | None = None) -> bool:
    statement = select(JointProject.id).where(func.lower(JointProject.code) == code.lower())
    if except_id is not None:
        statement = statement.where(JointProject.id != except_id)
    return db.scalar(statement) is not None


def add_joint_project(db: Session, actor: User, fields: dict) -> JointProject:
    """Add a joint project: `code`, `name`, `funding`, `years`, `coordinator`, `url` and, if it has any, `partners` (a list of names). It goes last."""
    require(db, actor, Area.SITE)
    clean = _clean_joint(fields, partial=False)
    if _code_taken(db, clean["code"]):
        raise CodeTaken
    last = db.scalar(select(func.max(JointProject.position)))
    project = JointProject(position=0 if last is None else last + 1, **clean)
    db.add(project)
    db.flush()
    audit.record(db, actor, "joint_project.add", "joint_project", str(project.id), after=joint_snapshot(project))
    db.commit()
    return project


def update_joint_project(db: Session, actor: User, project_id: int, fields: dict) -> JointProject:
    """Correct a joint project: only the fields given change."""
    project = get_joint_project(db, actor, project_id)
    clean = _clean_joint(fields, partial=True)
    if "code" in clean and clean["code"].lower() != project.code.lower() and _code_taken(db, clean["code"], project.id):
        raise CodeTaken
    before = joint_snapshot(project)
    for key, value in clean.items():
        setattr(project, key, value)
    db.flush()
    after = joint_snapshot(project)
    if after == before:
        db.rollback()
        return project
    audit.record(db, actor, "joint_project.update", "joint_project", str(project.id), before=before, after=after)
    db.commit()
    return project


def delete_joint_project(db: Session, actor: User, project_id: int) -> None:
    project = get_joint_project(db, actor, project_id)
    audit.record(db, actor, "joint_project.delete", "joint_project", str(project.id), before=joint_snapshot(project))
    db.delete(project)
    db.commit()
