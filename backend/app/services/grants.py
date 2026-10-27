"""Who may do what: a user may do what their grants say, and nothing else. The routes and the services ask here; nothing checks a role or a name.

A grant is a part of the content (an `Area`), and for the area `theme` the theme it is about, or every theme. The three kinds of people who keep the site have a preset: a bundle
of grants given together when the account is made.
"""
from enum import StrEnum

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.grant import Area, UserGrant
from app.models.theme import Theme
from app.models.user import User
from app.services import audit


class NotAllowed(Exception):
    """The user has no grant for this."""


class GrantError(ValueError):
    """What was asked about a grant cannot be done; the message can be shown."""


class Preset(StrEnum):
    ADMINISTRATIVE = "administrative"  # the administrative staff
    THEME_OWNER = "theme-owner"  # the one person who keeps every theme page
    PROJECTS_OWNER = "projects-owner"  # the one person who keeps the funded projects


# What each preset grants. A theme grant given by a preset is for every theme (theme_id empty), the ones added later included.
PRESET_AREAS: dict[Preset, tuple[Area, ...]] = {
    Preset.ADMINISTRATIVE: (Area.PEOPLE_ADD, Area.PEOPLE_EDIT, Area.PEOPLE_DELETE, Area.SITE, Area.ACCOUNTS),
    Preset.THEME_OWNER: (Area.PEOPLE_ADD, Area.THEME),
    Preset.PROJECTS_OWNER: (Area.PROJECTS,),
}


def has_grant(db: Session, user: User, area: Area, theme_id: int | None = None) -> bool:
    """Whether the user may work in `area`. For `theme`, `theme_id` names the theme: a grant for every theme covers it; with no `theme_id` the question is whether the user has
    any theme grant at all."""
    grants = db.scalars(select(UserGrant).where(UserGrant.user_id == user.id, UserGrant.area == Area(area).value))
    for grant in grants:
        if area != Area.THEME or theme_id is None or grant.theme_id is None or grant.theme_id == theme_id:
            return True
    return False


def require(db: Session, user: User, area: Area, theme_id: int | None = None) -> None:
    if not has_grant(db, user, area, theme_id):
        raise NotAllowed(f"No grant for {Area(area).value}")


def _where(user: User, area: Area, theme_id: int | None):
    return (UserGrant.user_id == user.id, UserGrant.area == area.value, UserGrant.theme_id == theme_id if theme_id is not None else UserGrant.theme_id.is_(None))


def grant(db: Session, user: User, area: Area, theme_id: int | None = None, actor: User | None = None) -> bool:
    """Give the user a grant (nothing happens if they have it). The caller commits. True when something was added."""
    area = Area(area)
    if area != Area.THEME and theme_id is not None:
        raise GrantError("Only a theme grant is about a theme.")
    if theme_id is not None and db.get(Theme, theme_id) is None:
        raise GrantError("There is no such theme.")
    if db.scalar(select(UserGrant).where(*_where(user, area, theme_id))):
        return False
    db.add(UserGrant(user_id=user.id, area=area.value, theme_id=theme_id))
    db.flush()  # the session does not flush by itself: without this a second call in the same transaction would not see the grant
    audit.record(db, actor, "grant.add", "user", user.email, after={"area": area.value, "theme": _theme_slug(db, theme_id)})
    return True


def revoke(db: Session, user: User, area: Area, theme_id: int | None = None, actor: User | None = None) -> bool:
    """Take a grant away. The caller commits. True when there was one."""
    area = Area(area)
    found = db.scalar(select(UserGrant).where(*_where(user, area, theme_id)))
    if found is None:
        return False
    db.delete(found)
    db.flush()
    audit.record(db, actor, "grant.remove", "user", user.email, before={"area": area.value, "theme": _theme_slug(db, theme_id)})
    return True


def apply_preset(db: Session, user: User, preset: Preset, actor: User | None = None) -> None:
    """Give the user every grant of the preset. The caller commits."""
    for area in PRESET_AREAS[Preset(preset)]:
        grant(db, user, area, None, actor)


def preset_of(user: User) -> Preset | None:
    """The preset whose grants are exactly the user's, if there is one (an account with other grants, given one by one, has none)."""
    have = {(g.area, g.theme_id) for g in user.grants}
    for preset, areas in PRESET_AREAS.items():
        if have == {(area.value, None) for area in areas}:
            return preset
    return None


def grants_snapshot(user: User) -> list[str]:
    """The user's grants as short texts for the audit log: `people_add`, `theme` (every theme) or `theme:vlsi-cad`."""
    return sorted(g.area + (f":{g.theme.slug}" if g.theme else "") for g in user.grants)


def replace_with_preset(db: Session, user: User, preset: Preset | None) -> None:
    """The user's grants become exactly those of the preset (none: they may do nothing). The caller records it and commits."""
    db.execute(delete(UserGrant).where(UserGrant.user_id == user.id))
    db.flush()
    db.expire(user, ["grants"])
    if preset is not None:
        for area in PRESET_AREAS[Preset(preset)]:
            db.add(UserGrant(user_id=user.id, area=area.value))
        db.flush()
        db.expire(user, ["grants"])


def _theme_slug(db: Session, theme_id: int | None) -> str | None:
    theme = db.get(Theme, theme_id) if theme_id is not None else None
    return theme.slug if theme else None
