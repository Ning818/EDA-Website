"""People: the one place that adds a person, corrects one and lets one leave. The admin routes (app/internal/people.py) call it, and so could a script. It checks who may do what,
validates every field, looks after the photo file and writes the audit row in the same transaction as the change.

Rules kept here, so that no way in can skip them:
- A person who has left is not deleted but gets the title "Former member". Deleting is for someone added by mistake, needs the grant `people_delete`, and removes the person from the
  topics and contacts of every theme too, so it shows what will go and has to be confirmed; what went is kept in the audit log. The user who added a person may also delete them, for the
  24 hours in which they may correct the entry.
- When a person becomes a Former member they are taken out of every theme's "Refer to" contacts. They stay in "Involved people", where their title now reads Former member.
- Adding a person needs the grant `people_add`; changing one needs `people_edit`. The user who added a person may also correct that entry for 24 hours.
- A person may be added straight into a research area of a theme, as one of its "Involved people": that needs the grant `theme` for that theme, and the person goes last among the
  people of the area.
- A photo needs the confirmation that the person agreed to it; who confirmed it and when is kept.
- A new person with the same name as someone already there is refused until the user confirms they are a different person.
"""
import re
import unicodedata
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, selectinload

from app.core.validation import InvalidInput, clean_text, clean_url
from app.models.grant import Area
from app.models.person import GROUP_OF_TITLE, Person, Title, titles_in
from app.models.theme import Theme, ThemeContact, TopicGroup, TopicGroupPerson
from app.models.user import User
from app.schemas.person import LINK_KEYS
from app.services import audit, photos
from app.services.grants import NotAllowed, has_grant

EDIT_WINDOW = timedelta(hours=24)

LINK_LABELS = {"polito": "The Politecnico page link", "orcid": "The ORCID link", "linkedin": "The LinkedIn link", "dept": "The department page link", "iris": "The IRIS link"}


class PersonNotFound(LookupError):
    pass


class PossibleDuplicate(Exception):
    """Someone with the same name is there already; `matches` are those people. Asked again with `confirm_distinct`, the person is added."""

    def __init__(self, matches: list[Person]):
        super().__init__("a person with this name exists")
        self.matches = matches


class PhotoConsentRequired(Exception):
    """A photo came without the confirmation that the person agreed to it."""


@dataclass(frozen=True)
class Affected:
    """A theme that lists the person as a contact: it loses them when they leave, and `contacts_left` are the contacts it keeps."""

    theme_slug: str
    theme_name: str
    contacts_left: int


@dataclass(frozen=True)
class TopicMembership:
    """A research topic group a person is listed under, as "Involved people"."""

    theme_slug: str
    theme_name: str
    group_title: str


@dataclass(frozen=True)
class ResearchArea:
    """A research area of a theme that a user may list people under."""

    id: int
    title: str
    theme_slug: str
    theme_name: str


@dataclass(frozen=True)
class DeleteImpact:
    """What deleting a person takes with them: the contacts and the topic groups they are in."""

    refer_to: list[Affected]
    topics: list[TopicMembership]


class DeleteNeedsConfirmation(Exception):
    """Deleting a person has to be confirmed (`confirm`), whatever it takes with them; `impact` is what it would take."""

    def __init__(self, impact: DeleteImpact):
        super().__init__("deleting needs a confirmation")
        self.impact = impact


class LeaveNeedsConfirmation(Exception):
    """The person is a contact of some themes and a title of Former member removes them from there; asked again with `confirm_leave`, it is done."""

    def __init__(self, affected: list[Affected]):
        super().__init__("leaving removes the person from contacts")
        self.affected = affected


# --- names ------------------------------------------------------------------------------------------------------------------------------------------------------------


def _words(name: str) -> list[str]:
    folded = "".join(c for c in unicodedata.normalize("NFKD", name) if not unicodedata.combining(c)).lower()
    return re.findall(r"[a-z0-9]+", folded)


def name_key(name: str) -> str:
    """Two names are the same person's when this is: capitals, accents, punctuation and the order of the words do not count."""
    return " ".join(sorted(_words(name)))


def slugify(name: str) -> str:
    return "-".join(_words(name))[:90] or "person"


def unique_slug(db: Session, name: str) -> str:
    base = slugify(name)
    slug, number = base, 2
    while db.scalar(select(Person.id).where(Person.slug == slug)) is not None:
        slug = f"{base}-{number}"
        number += 1
    return slug


def find_possible_duplicates(db: Session, name: str) -> list[Person]:
    key = name_key(name)
    if not key:
        return []
    return [p for p in db.scalars(select(Person).order_by(Person.id)) if key in (name_key(p.name), name_key(p.card_name or ""))]


# --- who may change a person ------------------------------------------------------------------------------------------------------------------------------------------


def editable_until(person: Person) -> datetime:
    return person.created_at + EDIT_WINDOW


def can_edit_person(db: Session, actor: User, person: Person, now: datetime | None = None) -> bool:
    """Those with `people_edit` may always. The one who added the person (and may still add people) may correct the entry until a day after it was made."""
    if has_grant(db, actor, Area.PEOPLE_EDIT):
        return True
    now = now or datetime.now(UTC)
    return person.created_by_id == actor.id and has_grant(db, actor, Area.PEOPLE_ADD) and now < editable_until(person)


def can_delete_person(db: Session, actor: User, person: Person, now: datetime | None = None) -> bool:
    """Those with `people_delete` may always. The one who added the person (and may still add people) may delete them until a day after the entry was made, like correcting it."""
    if has_grant(db, actor, Area.PEOPLE_DELETE):
        return True
    now = now or datetime.now(UTC)
    return person.created_by_id == actor.id and has_grant(db, actor, Area.PEOPLE_ADD) and now < editable_until(person)


# --- reading ----------------------------------------------------------------------------------------------------------------------------------------------------------


def get_person(db: Session, slug: str) -> Person:
    person = db.scalar(select(Person).where(Person.slug == slug))
    if person is None:
        raise PersonNotFound(slug)
    return person


def contacts_affected(db: Session, person: Person) -> list[Affected]:
    """The themes that list the person as a contact."""
    affected = []
    for contact in db.scalars(select(ThemeContact).where(ThemeContact.person_id == person.id).order_by(ThemeContact.theme_id)):
        theme = db.get(Theme, contact.theme_id)
        left = db.scalar(select(func.count()).select_from(ThemeContact).where(ThemeContact.theme_id == theme.id, ThemeContact.person_id != person.id))
        affected.append(Affected(theme.slug, theme.name, left or 0))
    return affected


def leave_preview(db: Session, actor: User, slug: str, now: datetime | None = None) -> list[Affected]:
    """What letting this person leave would change, to show before it is done."""
    person = get_person(db, slug)
    if not can_edit_person(db, actor, person, now):
        raise NotAllowed("May not change this person")
    if person.title == Title.FORMER_MEMBER:
        return []
    return contacts_affected(db, person)


def research_areas(db: Session, actor: User) -> list[ResearchArea]:
    """The research areas the user may list people under: those of the themes they hold the grant `theme` for, in the order of the site."""
    themes = db.scalars(select(Theme).order_by(Theme.position).options(selectinload(Theme.groups)))
    return [ResearchArea(group.id, group.title, theme.slug, theme.name) for theme in themes if has_grant(db, actor, Area.THEME, theme.id) for group in theme.groups]


def delete_impact(db: Session, person: Person) -> DeleteImpact:
    """The contacts and the topic groups that would lose the person if they were deleted."""
    rows = db.execute(
        select(Theme.slug, Theme.name, TopicGroup.title)
        .join(TopicGroup, TopicGroup.theme_id == Theme.id)
        .join(TopicGroupPerson, TopicGroupPerson.group_id == TopicGroup.id)
        .where(TopicGroupPerson.person_id == person.id)
        .order_by(Theme.id, TopicGroup.position)
    ).all()
    return DeleteImpact(refer_to=contacts_affected(db, person), topics=[TopicMembership(*row) for row in rows])


def delete_preview(db: Session, actor: User, slug: str, now: datetime | None = None) -> DeleteImpact:
    """What deleting this person would take with them, to show before it is done."""
    person = get_person(db, slug)
    if not can_delete_person(db, actor, person, now):
        raise NotAllowed("May not delete this person")
    return delete_impact(db, person)


def snapshot(person: Person) -> dict:
    """What the audit log keeps of a person."""
    return {
        "name": person.name,
        "card_name": person.card_name,
        "title": person.title,
        "photo": person.photo,
        "links": {key: getattr(person, f"{key}_url") for key in LINK_KEYS if getattr(person, f"{key}_url")},
    }


# --- writing ----------------------------------------------------------------------------------------------------------------------------------------------------------


def _clean_fields(fields: dict, partial: bool) -> dict:
    """The fields that were given, checked and ready to put on a person. `partial`: only the ones present are looked at."""
    clean: dict = {}
    if "name" in fields or not partial:
        clean["name"] = clean_text(fields.get("name"), "name", label="The name", max_length=150, required=True)
    if "card_name" in fields:
        clean["card_name"] = clean_text(fields["card_name"], "card_name", label="The name on the small cards", max_length=150)
    if "title" in fields or not partial:
        try:
            clean["title"] = Title(fields.get("title"))
        except ValueError:
            raise InvalidInput("title", "The title must be one of: " + ", ".join(t.value for t in Title) + ".") from None
    for key in LINK_KEYS:
        if key in fields:
            clean[f"{key}_url"] = clean_url(fields[key], key, label=LINK_LABELS[key])
    return clean


def _end_of_group(db: Session, title: Title) -> int:
    titles = [t.value for t in titles_in(GROUP_OF_TITLE[title])]
    last = db.scalar(select(func.max(Person.position)).where(Person.title.in_(titles)))
    return 0 if last is None else last + 1


def _prepare_photo(photo: bytes | None, consent: bool) -> tuple[bytes, str] | None:
    if photo is None:
        return None
    if not consent:
        raise PhotoConsentRequired
    return photos.prepare(photo)


def add_person(
    db: Session,
    actor: User,
    fields: dict,
    photo: bytes | None = None,
    photo_consent: bool = False,
    confirm_distinct: bool = False,
    topic_group_id: int | None = None,
) -> Person:
    """Add a person, who shows on the People page at once. `fields`: name, title and, if wanted, card_name and the links (polito, orcid, linkedin, dept, iris). With `topic_group_id` the
    person is also listed under that research area of a theme, as one of its "Involved people", which needs the grant `theme` for that theme."""
    if not has_grant(db, actor, Area.PEOPLE_ADD):
        raise NotAllowed("May not add people")
    group = None
    if topic_group_id is not None:
        group = db.get(TopicGroup, topic_group_id)
        if group is None:
            raise InvalidInput("topic_group_id", "That research area does not exist.")
        if not has_grant(db, actor, Area.THEME, group.theme_id):
            raise NotAllowed("May not list people under this theme")
    clean = _clean_fields(fields, partial=False)
    prepared = _prepare_photo(photo, photo_consent)
    if not confirm_distinct:
        matches = find_possible_duplicates(db, clean["name"])
        if matches:
            raise PossibleDuplicate(matches)

    person = Person(slug=unique_slug(db, clean["name"]), created_by_id=actor.id, position=_end_of_group(db, clean["title"]), **{**clean, "title": clean["title"].value})
    path = None
    if prepared:
        data, extension = prepared
        path = photos.stored_path(person.slug, data, extension)
        person.photo = path
        person.photo_consent_by_id = actor.id
        person.photo_consent_at = datetime.now(UTC)
    try:
        db.add(person)
        db.flush()
        after = snapshot(person)
        if group:
            last = db.scalar(select(func.max(TopicGroupPerson.position)).where(TopicGroupPerson.group_id == group.id))
            db.add(TopicGroupPerson(group_id=group.id, person_id=person.id, position=0 if last is None else last + 1))
            after["listed_under"] = {"theme": group.theme.slug, "research_area": group.title}
        audit.record(db, actor, "person.add", "person", person.slug, after=after)
        if prepared:
            photos.write(path, prepared[0])
        db.commit()
    except Exception:
        db.rollback()
        if path:
            photos.delete(path)
        raise
    return person


def delete_person(db: Session, actor: User, slug: str, confirm: bool = False, now: datetime | None = None) -> None:
    """Delete a person, for one added by mistake (a member who left is made a Former member instead): those with `people_delete`, or the one who added the person for a day. Without
    `confirm` nothing is done and what would go is returned in the refusal. The person's rows in the topic groups and the contacts of every theme go with them (the database cascades),
    and what went is kept in the audit log; the photo file is removed."""
    person = get_person(db, slug)
    if not can_delete_person(db, actor, person, now):
        raise NotAllowed("May not delete this person")
    impact = delete_impact(db, person)
    if not confirm:
        raise DeleteNeedsConfirmation(impact)
    before = snapshot(person)
    before["removed_from_refer_to"] = [a.theme_slug for a in impact.refer_to]
    before["removed_from_topics"] = [f"{t.theme_slug}: {t.group_title}" for t in impact.topics]
    photo = person.photo
    audit.record(db, actor, "person.delete", "person", person.slug, before=before)
    db.delete(person)
    db.commit()
    if photo and db.scalar(select(Person.id).where(Person.photo == photo)) is None:
        photos.delete(photo)


def update_person(
    db: Session,
    actor: User,
    slug: str,
    fields: dict,
    photo: bytes | None = None,
    photo_consent: bool = False,
    confirm_leave: bool = False,
    now: datetime | None = None,
) -> Person:
    """Correct a person: only the fields given change (a link given empty is removed). A new title of Former member lets the person leave: they come out of every theme's
    "Refer to" contacts, which first has to be confirmed (`confirm_leave`) when there are any."""
    person = get_person(db, slug)
    if not can_edit_person(db, actor, person, now):
        raise NotAllowed("May not change this person")
    clean = _clean_fields(fields, partial=True)
    prepared = _prepare_photo(photo, photo_consent)

    before = snapshot(person)
    leaving = clean.get("title") == Title.FORMER_MEMBER and person.title != Title.FORMER_MEMBER
    affected = contacts_affected(db, person) if leaving else []
    if affected and not confirm_leave:
        raise LeaveNeedsConfirmation(affected)

    new_title = clean.pop("title", None)
    if new_title is not None and new_title.value != person.title:
        if GROUP_OF_TITLE[new_title] != GROUP_OF_TITLE[Title(person.title)]:
            person.position = _end_of_group(db, new_title)
        person.title = new_title.value
    for key, value in clean.items():
        setattr(person, key, value)

    old_photo, new_path = person.photo, None
    if prepared:
        data, extension = prepared
        new_path = photos.stored_path(person.slug, data, extension)
        person.photo = new_path
        person.photo_consent_by_id = actor.id
        person.photo_consent_at = datetime.now(UTC)
    try:
        if affected:
            db.execute(delete(ThemeContact).where(ThemeContact.person_id == person.id))
        after = snapshot(person)
        if leaving:
            after["removed_from_refer_to"] = [a.theme_slug for a in affected]
        audit.record(db, actor, "person.leave" if leaving else "person.update", "person", person.slug, before=before, after=after)
        if prepared:
            photos.write(new_path, prepared[0])
        db.commit()
    except Exception:
        db.rollback()
        if new_path and new_path != old_photo:
            photos.delete(new_path)
        raise
    if old_photo and new_path and old_photo != new_path and db.scalar(select(Person.id).where(Person.photo == old_photo)) is None:
        photos.delete(old_photo)
    return person
