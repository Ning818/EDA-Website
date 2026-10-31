"""Theme content: the one place that writes what a theme page says - its words, its contacts ("Refer to"), its research areas with their topics and involved people, and its two highlight
cards. The admin routes (app/internal/themes.py) call it, and so could a script. It checks who may do what, validates every field, looks after the picture of a highlight card and writes
the audit row in the same transaction as the change.

Rules kept here, so that no way in can skip them:
- Everything here needs the grant `theme` for the theme in question (a grant for every theme covers all of them). What the theme looks like - colour, artwork - is in the website's code,
  not here; the sentence about the funded projects belongs to the funded-projects owner (app/services/projects.py).
- The words are plain text and the addresses http(s) ones (app/core/validation.py), and what a page can hold is limited, so that a long text cannot break it.
- A contact ("Refer to") is a person of the People list who has not left: a Former member is refused. A theme left with no contact shows no Refer to section. Contacts and the involved
  people of an area are chosen from the People list, never typed; those who left stay in the involved people, with their title Former member.
- A research area and a topic go last where they are added and are moved up or down one place at a time. Removing an area also removes its topics and its involved people, so it shows what
  will go and has to be confirmed.
- A highlight card (a paper or a project) is typed by hand, nothing is read from IRIS. Its picture is optional, is checked, made smaller and stored like the other pictures, and needs a text
  alternative; a replaced or removed picture is deleted. There is one card of each kind to a theme.
- A change that changes nothing writes no audit row.
- A theme is made by the developer from the command line (`create_theme`, `python -m app.manage create-theme`), never in the admin: the website draws a theme only when its template is in
  the code (frontend/src/themes.js), so a theme made here is kept up to date by its owners without the public seeing it, until the developer adds the template.
"""
import re
from dataclasses import dataclass

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, selectinload

from app.core.validation import InvalidInput, clean_text, clean_url
from app.models.grant import Area
from app.models.person import Person, Title
from app.models.theme import Highlight, HighlightKind, Theme, ThemeContact, Topic, TopicGroup, TopicGroupPerson
from app.models.user import User
from app.services import audit, photos
from app.services.grants import has_grant, require
from app.services.projects import BLURB_MAX, ThemeNotFound

HIGHLIGHT_FOLDER = "highlights"
HIGHLIGHT_MAX_SIDE = 1200
NAME_MAX = 100
SHORT_NAME_MAX = 50
INTRO_MAX = 1000
SUMMARY_MAX = 1000
AREA_TITLE_MAX = 200
TOPIC_MAX = 300
AREAS_MAX = 12
TOPICS_MAX = 15
AREA_PEOPLE_MAX = 24
CONTACTS_MAX = 12
TAGS_MAX = 8
TAG_MAX = 100
SLUG_MAX = 50
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
# what a theme starts with when the developer gives no words: the owner writes the real ones in the admin
PLACEHOLDER_INTRO = "The introduction of this theme is still to be written."
PLACEHOLDER_FUNDED_BLURB = "The sentence about the funded projects of this theme is still to be written."


class ThemeSlugTaken(ValueError):
    pass


class ThemeStateError(ValueError):
    """A theme cannot be put on or taken off the site as asked; the message can be shown."""


class AreaNotFound(LookupError):
    pass


class TopicNotFound(LookupError):
    pass


class DeleteNeedsConfirmation(Exception):
    """Removing an area has to be confirmed; `topics` and `people` are what goes with it."""

    def __init__(self, topics: int, people: int):
        super().__init__("removing an area needs a confirmation")
        self.topics = topics
        self.people = people


@dataclass(frozen=True)
class AreaImpact:
    topics: int
    people: int


# --- who may, and finding things --------------------------------------------------------------------------------------------------------------------------------------


def _theme_for(db: Session, actor: User, slug: str) -> Theme:
    """The theme, if the user may keep it: a user with no theme grant at all is refused before anything is looked up."""
    require(db, actor, Area.THEME)
    theme = db.scalar(select(Theme).where(Theme.slug == slug))
    if theme is None:
        raise ThemeNotFound(slug)
    require(db, actor, Area.THEME, theme.id)
    return theme


def editable_themes(db: Session, actor: User) -> list[Theme]:
    """The themes the user may keep, in the order of the site (none for a user with no theme grant)."""
    return [theme for theme in db.scalars(select(Theme).order_by(Theme.position)) if has_grant(db, actor, Area.THEME, theme.id)]


def get_theme(db: Session, actor: User, slug: str) -> Theme:
    theme = _theme_for(db, actor, slug)
    return db.scalar(
        select(Theme)
        .where(Theme.id == theme.id)
        .options(
            selectinload(Theme.highlights),
            selectinload(Theme.groups).selectinload(TopicGroup.topics),
            selectinload(Theme.groups).selectinload(TopicGroup.members).selectinload(TopicGroupPerson.person),
            selectinload(Theme.contacts).selectinload(ThemeContact.person),
        )
    )


def _area_for(db: Session, actor: User, area_id: int) -> TopicGroup:
    require(db, actor, Area.THEME)
    area = db.get(TopicGroup, area_id)
    if area is None:
        raise AreaNotFound(area_id)
    require(db, actor, Area.THEME, area.theme_id)
    return area


def _topic_for(db: Session, actor: User, topic_id: int) -> Topic:
    require(db, actor, Area.THEME)
    topic = db.get(Topic, topic_id)
    if topic is None:
        raise TopicNotFound(topic_id)
    require(db, actor, Area.THEME, topic.group.theme_id)
    return topic


def _people_by_slug(db: Session, slugs: list[str], field: str) -> list[Person]:
    """The people these slugs name, in the order given and each once; one that is not in the People list is refused."""
    seen: list[str] = []
    for slug in slugs:
        if not isinstance(slug, str):
            raise InvalidInput(field, "The people must be given by their addresses.")
        if slug not in seen:
            seen.append(slug)
    found = {p.slug: p for p in db.scalars(select(Person).where(Person.slug.in_(seen)))} if seen else {}
    missing = [slug for slug in seen if slug not in found]
    if missing:
        raise InvalidInput(field, f"There is no one in the People list with the address {missing[0]}.")
    return [found[slug] for slug in seen]


def _move(items: list, item, direction: str) -> bool:
    """Renumber the items 0, 1, 2 ... in their order and move `item` one place up or down; False where it is at the end already."""
    if direction not in ("up", "down"):
        raise InvalidInput("direction", "Move up or down.")
    items = sorted(items, key=lambda i: (i.position, i.id))
    for place, one in enumerate(items):
        one.position = place
    at = items.index(item)
    other = at - 1 if direction == "up" else at + 1
    if not 0 <= other < len(items):
        return False
    items[at].position, items[other].position = items[other].position, items[at].position
    return True


# --- a new theme (the developer, from the command line) ----------------------------------------------------------------------------------------------------------------


def create_theme(
    db: Session,
    slug: str | None,
    name: str | None,
    short_name: str | None = None,
    intro: str | None = None,
    funded_blurb: str | None = None,
    home_summary: str | None = None,
    position: int | None = None,
) -> Theme:
    """Make a theme with its words: it goes last in the order of the admin unless `position` (0 is first) puts it earlier, which moves the ones from there on one place down. It is made
    with no research areas, contacts, highlight cards or projects: those are written in the admin. Without an `intro` or a `funded_blurb` a placeholder is written, since neither may be
    empty. The audit row says it was made from the command line."""
    slug = (slug or "").strip()
    if not slug or len(slug) > SLUG_MAX or not SLUG_PATTERN.match(slug):
        raise InvalidInput("slug", f"The slug must be lower-case letters and digits with single hyphens between them, at most {SLUG_MAX} characters (for example smart-city).")
    if db.scalar(select(Theme.id).where(Theme.slug == slug)) is not None:
        raise ThemeSlugTaken(f"There is a theme with the slug {slug} already.")
    words = {
        "name": clean_text(name, "name", label="The name", max_length=NAME_MAX, required=True),
        "short_name": clean_text(short_name, "short_name", label="The short name", max_length=SHORT_NAME_MAX),
        "home_summary": clean_text(home_summary, "home_summary", label="The home page paragraph", max_length=SUMMARY_MAX),
        "intro": clean_text(intro, "intro", label="The introduction", max_length=INTRO_MAX) or PLACEHOLDER_INTRO,
        "funded_blurb": clean_text(funded_blurb, "funded_blurb", label="The sentence about the funded projects", max_length=BLURB_MAX) or PLACEHOLDER_FUNDED_BLURB,
    }
    last = db.scalar(select(func.max(Theme.position)))
    last = -1 if last is None else last
    if position is None:
        position = last + 1
    elif position < 0:
        raise InvalidInput("position", "The position must be 0 or more.")
    else:
        position = min(position, last + 1)
        for other in db.scalars(select(Theme).where(Theme.position >= position)):
            other.position += 1
    theme = Theme(slug=slug, position=position, on_site=False, **words)
    db.add(theme)
    db.flush()
    audit.record(db, None, "theme.create", "theme", slug, after={"slug": slug, "position": position, "on_site": False, **words})
    db.commit()
    return theme


def set_on_site(db: Session, slug: str, on_site: bool) -> Theme:
    """Say whether the website shows the theme (the developer, from the command line, when the theme's template is in or out of the front end's code). The public routes know a theme
    only while it is on the site, so the site always has at least one: the last one cannot be taken off. Saying what is already so changes nothing and writes no row."""
    theme = db.scalar(select(Theme).where(Theme.slug == slug))
    if theme is None:
        raise ThemeNotFound(slug)
    if theme.on_site == on_site:
        return theme
    if not on_site and db.scalar(select(func.count()).select_from(Theme).where(Theme.on_site.is_(True))) <= 1:
        raise ThemeStateError("The website needs at least one theme: this is the last one on it.")
    theme.on_site = on_site
    audit.record(db, None, "theme.on_site" if on_site else "theme.off_site", "theme", slug, before={"on_site": not on_site}, after={"on_site": on_site})
    db.commit()
    return theme


# --- B3: the words ----------------------------------------------------------------------------------------------------------------------------------------------------


def words_snapshot(theme: Theme) -> dict:
    return {"name": theme.name, "short_name": theme.short_name, "home_summary": theme.home_summary, "intro": theme.intro}


def update_words(db: Session, actor: User, slug: str, fields: dict) -> Theme:
    """Change the theme's words: `name`, `short_name`, `home_summary` (the paragraph beside its particle cloud on the home page) and `intro` (the paragraph under the title of its Research
    page). Only the fields given change; the optional ones given empty are removed."""
    theme = _theme_for(db, actor, slug)
    clean: dict = {}
    if "name" in fields:
        clean["name"] = clean_text(fields["name"], "name", label="The name", max_length=NAME_MAX, required=True)
    if "short_name" in fields:
        clean["short_name"] = clean_text(fields["short_name"], "short_name", label="The short name", max_length=SHORT_NAME_MAX)
    if "home_summary" in fields:
        clean["home_summary"] = clean_text(fields["home_summary"], "home_summary", label="The home page paragraph", max_length=SUMMARY_MAX)
    if "intro" in fields:
        clean["intro"] = clean_text(fields["intro"], "intro", label="The introduction", max_length=INTRO_MAX, required=True)
    before = words_snapshot(theme)
    for key, value in clean.items():
        setattr(theme, key, value)
    after = words_snapshot(theme)
    if after == before:
        return theme
    audit.record(db, actor, "theme.words", "theme", theme.slug, before=before, after=after)
    db.commit()
    return theme


# --- B4: the contacts -------------------------------------------------------------------------------------------------------------------------------------------------


def set_contacts(db: Session, actor: User, slug: str, people: list[str]) -> Theme:
    """The theme's "Refer to" contacts: these people, in this order. A Former member is refused; none at all is allowed (the section then disappears)."""
    theme = _theme_for(db, actor, slug)
    chosen = _people_by_slug(db, people, "people")
    if len(chosen) > CONTACTS_MAX:
        raise InvalidInput("people", f"A theme can have at most {CONTACTS_MAX} contacts.")
    left = next((p for p in chosen if p.title == Title.FORMER_MEMBER.value), None)
    if left:
        raise InvalidInput("people", f"{left.name} has left the group and cannot be a contact.")
    before = [c.person.slug for c in sorted(theme.contacts, key=lambda c: c.position)]
    after = [p.slug for p in chosen]
    if before == after:
        return theme
    db.execute(delete(ThemeContact).where(ThemeContact.theme_id == theme.id))
    db.expire(theme, ["contacts"])
    db.add_all(ThemeContact(theme_id=theme.id, person_id=p.id, position=i) for i, p in enumerate(chosen))
    audit.record(db, actor, "theme.contacts", "theme", theme.slug, before={"contacts": before}, after={"contacts": after})
    db.commit()
    return theme


# --- B1: the research areas, their topics and their involved people -------------------------------------------------------------------------------------------------------


def add_area(db: Session, actor: User, slug: str, title: str | None) -> TopicGroup:
    """Add a research area to the theme; it goes last."""
    theme = _theme_for(db, actor, slug)
    clean = clean_text(title, "title", label="The title", max_length=AREA_TITLE_MAX, required=True)
    count = db.scalar(select(func.count()).select_from(TopicGroup).where(TopicGroup.theme_id == theme.id))
    if count >= AREAS_MAX:
        raise InvalidInput("title", f"A theme can have at most {AREAS_MAX} research areas.")
    last = db.scalar(select(func.max(TopicGroup.position)).where(TopicGroup.theme_id == theme.id))
    area = TopicGroup(theme_id=theme.id, title=clean, position=0 if last is None else last + 1)
    db.add(area)
    db.flush()
    audit.record(db, actor, "area.add", "area", str(area.id), after={"theme": theme.slug, "title": clean})
    db.commit()
    return area


def update_area(db: Session, actor: User, area_id: int, title: str | None) -> TopicGroup:
    area = _area_for(db, actor, area_id)
    clean = clean_text(title, "title", label="The title", max_length=AREA_TITLE_MAX, required=True)
    if clean == area.title:
        return area
    before = area.title
    area.title = clean
    audit.record(db, actor, "area.update", "area", str(area.id), before={"title": before}, after={"title": clean})
    db.commit()
    return area


def move_area(db: Session, actor: User, area_id: int, direction: str) -> TopicGroup:
    area = _area_for(db, actor, area_id)
    siblings = list(db.scalars(select(TopicGroup).where(TopicGroup.theme_id == area.theme_id)))
    if _move(siblings, area, direction):
        audit.record(db, actor, "area.move", "area", str(area.id), after={"title": area.title, "direction": direction})
    db.commit()
    return area


def area_impact(db: Session, actor: User, area_id: int) -> AreaImpact:
    """What removing the area would take with it, to show before it is done."""
    area = _area_for(db, actor, area_id)
    return AreaImpact(
        topics=db.scalar(select(func.count()).select_from(Topic).where(Topic.group_id == area.id)),
        people=db.scalar(select(func.count()).select_from(TopicGroupPerson).where(TopicGroupPerson.group_id == area.id)),
    )


def delete_area(db: Session, actor: User, area_id: int, confirm: bool = False) -> None:
    """Remove a research area with its topics and its involved people (the database cascades). Without `confirm` nothing is done and what would go is returned in the refusal."""
    area = _area_for(db, actor, area_id)
    impact = area_impact(db, actor, area_id)
    if not confirm:
        raise DeleteNeedsConfirmation(impact.topics, impact.people)
    before = {
        "theme": area.theme.slug,
        "title": area.title,
        "topics": [t.text for t in area.topics],
        "people": [m.person.slug for m in area.members],
    }
    audit.record(db, actor, "area.delete", "area", str(area.id), before=before)
    db.delete(area)
    db.commit()


def add_topic(db: Session, actor: User, area_id: int, text: str | None) -> Topic:
    """Add a research topic to the area; it goes last."""
    area = _area_for(db, actor, area_id)
    clean = clean_text(text, "text", label="The topic", max_length=TOPIC_MAX, required=True)
    count = db.scalar(select(func.count()).select_from(Topic).where(Topic.group_id == area.id))
    if count >= TOPICS_MAX:
        raise InvalidInput("text", f"A research area can have at most {TOPICS_MAX} topics.")
    last = db.scalar(select(func.max(Topic.position)).where(Topic.group_id == area.id))
    topic = Topic(group_id=area.id, text=clean, position=0 if last is None else last + 1)
    db.add(topic)
    db.flush()
    audit.record(db, actor, "topic.add", "topic", str(topic.id), after={"theme": area.theme.slug, "area": area.title, "text": clean})
    db.commit()
    return topic


def update_topic(db: Session, actor: User, topic_id: int, text: str | None) -> Topic:
    topic = _topic_for(db, actor, topic_id)
    clean = clean_text(text, "text", label="The topic", max_length=TOPIC_MAX, required=True)
    if clean == topic.text:
        return topic
    before = topic.text
    topic.text = clean
    audit.record(db, actor, "topic.update", "topic", str(topic.id), before={"text": before}, after={"text": clean})
    db.commit()
    return topic


def move_topic(db: Session, actor: User, topic_id: int, direction: str) -> Topic:
    topic = _topic_for(db, actor, topic_id)
    siblings = list(db.scalars(select(Topic).where(Topic.group_id == topic.group_id)))
    if _move(siblings, topic, direction):
        audit.record(db, actor, "topic.move", "topic", str(topic.id), after={"text": topic.text, "direction": direction})
    db.commit()
    return topic


def delete_topic(db: Session, actor: User, topic_id: int) -> None:
    topic = _topic_for(db, actor, topic_id)
    audit.record(db, actor, "topic.delete", "topic", str(topic.id), before={"theme": topic.group.theme.slug, "area": topic.group.title, "text": topic.text})
    db.delete(topic)
    db.commit()


def set_area_people(db: Session, actor: User, area_id: int, people: list[str]) -> TopicGroup:
    """The involved people of the area: these people, in this order (the pages show them by rank, and within a rank in this order). Those who left may stay."""
    area = _area_for(db, actor, area_id)
    chosen = _people_by_slug(db, people, "people")
    if len(chosen) > AREA_PEOPLE_MAX:
        raise InvalidInput("people", f"A research area can have at most {AREA_PEOPLE_MAX} involved people.")
    before = [m.person.slug for m in sorted(area.members, key=lambda m: m.position)]
    after = [p.slug for p in chosen]
    if before == after:
        return area
    db.execute(delete(TopicGroupPerson).where(TopicGroupPerson.group_id == area.id))
    db.expire(area, ["members"])
    db.add_all(TopicGroupPerson(group_id=area.id, person_id=p.id, position=i) for i, p in enumerate(chosen))
    audit.record(db, actor, "area.people", "area", str(area.id), before={"title": area.title, "people": before}, after={"title": area.title, "people": after})
    db.commit()
    return area


# --- B2: the highlight cards --------------------------------------------------------------------------------------------------------------------------------------------


def highlight_snapshot(card: Highlight | None) -> dict | None:
    if card is None:
        return None
    return {
        "title": card.title,
        "subtitle": card.subtitle,
        "authors_full": card.authors_full,
        "authors_short": card.authors_short,
        "venue": card.venue,
        "tags": list(card.tags or []),
        "text": card.text,
        "url": card.url,
        "image": card.image,
        "image_alt": card.image_alt,
    }


def _kind(value: str | None) -> str:
    try:
        return HighlightKind(value).value
    except ValueError:
        raise InvalidInput("kind", "The card is a paper or a project.") from None


def _clean_tags(value) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, (list, tuple)):
        raise InvalidInput("tags", "The keywords must be a list.")
    tags = [clean_text(item, "tags", label="A keyword", max_length=TAG_MAX) for item in value]
    tags = [tag for tag in tags if tag]
    if len(tags) > TAGS_MAX:
        raise InvalidInput("tags", f"A card can have at most {TAGS_MAX} keywords.")
    return tags


def save_highlight(db: Session, actor: User, slug: str, kind: str, fields: dict, image: bytes | None = None, remove_image: bool = False) -> Highlight:
    """Write the theme's highlight card of this `kind` (paper or project), from every field of the card: `title`, `text`, `url`, `tags`, and for a paper `authors_full`, `authors_short` and
    `venue`, for a project the second line of the title, `subtitle`. A new `image` replaces the picture, `remove_image` takes it away, and a picture needs `image_alt`, its text alternative."""
    theme = _theme_for(db, actor, slug)
    kind = _kind(kind)
    if image is not None and remove_image:
        raise InvalidInput("image", "Choose a new picture or remove the picture, not both.")
    paper = kind == HighlightKind.PAPER.value
    clean = {
        "title": clean_text(fields.get("title"), "title", label="The title", max_length=300, required=True),
        "subtitle": clean_text(fields.get("subtitle"), "subtitle", label="The second line of the title", max_length=300, required=not paper) if not paper else None,
        "authors_full": clean_text(fields.get("authors_full"), "authors_full", label="The authors", max_length=600, required=True) if paper else None,
        "authors_short": clean_text(fields.get("authors_short"), "authors_short", label="The authors' short forms", max_length=600, required=True) if paper else None,
        "venue": clean_text(fields.get("venue"), "venue", label="The journal or conference", max_length=200, required=True) if paper else None,
        "tags": _clean_tags(fields.get("tags")),
        "text": clean_text(fields.get("text"), "text", label="The summary", max_length=1200, required=True),
        "url": clean_url(fields.get("url"), "url", label="The address"),
    }
    if clean["url"] is None:
        raise InvalidInput("url", "The address is required.")
    prepared = None if image is None else photos.prepare(image, max_side=HIGHLIGHT_MAX_SIDE, what="picture")

    card = db.scalar(select(Highlight).where(Highlight.theme_id == theme.id, Highlight.kind == kind))
    before = highlight_snapshot(card)
    old_image = card.image if card else None
    keeps = old_image is not None and not remove_image and prepared is None
    has_picture = prepared is not None or keeps
    alt = clean_text(fields.get("image_alt"), "image_alt", label="The text alternative", max_length=300)
    if has_picture and not alt:
        raise InvalidInput("image_alt", "Describe the picture for those who cannot see it.")

    new_path = None
    if card is None:
        card = Highlight(theme_id=theme.id, kind=kind)
        db.add(card)
    for key, value in clean.items():
        setattr(card, key, value)
    if prepared:
        new_path = photos.stored_path(f"{theme.slug}-{kind}", prepared[0], prepared[1], HIGHLIGHT_FOLDER)
        card.image = new_path
    elif remove_image:
        card.image = None
    card.image_alt = alt if has_picture else None
    try:
        db.flush()
        after = highlight_snapshot(card)
        if after == before:
            db.rollback()
            return card
        audit.record(db, actor, "highlight.save", "highlight", f"{theme.slug}:{kind}", before=before, after=after)
        if prepared:
            photos.write(new_path, prepared[0], HIGHLIGHT_FOLDER)
        db.commit()
    except Exception:
        db.rollback()
        if new_path and new_path != old_image:
            photos.delete(new_path, HIGHLIGHT_FOLDER)
        raise
    if old_image and old_image != card.image and db.scalar(select(Highlight.id).where(Highlight.image == old_image)) is None:
        photos.delete(old_image, HIGHLIGHT_FOLDER)
    return card
