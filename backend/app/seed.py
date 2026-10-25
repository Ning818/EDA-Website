"""Loads the starting data into the database and the media folder: the people of the People page (seed/people.json) with their photos (seed/photos), the
four themes (seed/themes.json) with their words, research areas, projects and contacts, the Collaborations page (seed/collaborations.json) with the logos (seed/logos), and the
fixed paragraphs of the People and Collaborations pages (seed/pages.json), and the footer's phone and fax numbers (seed/site.json).

Run from the backend folder:  python -m app.seed
It can be run again: a person already there (same slug) is updated, not duplicated; a theme is rewritten from the file, with everything under it; the collaborators and
joint projects are rewritten from the file; people and themes missing from the files are left alone.
"""
import json
import shutil

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import BACKEND_DIR, settings
from app.db.session import SessionLocal
from app.models.collaboration import Collaborator, CollaboratorKind, JointProject
from app.models.page import PageText
from app.models.person import Person, Title
from app.models.site import SiteContact
from app.models.theme import Highlight, Project, Theme, ThemeContact, Topic, TopicGroup, TopicGroupPerson
from app.schemas.person import LINK_KEYS

SEED_DIR = BACKEND_DIR / "seed"


def _load(name: str) -> list[dict]:
    return json.loads((SEED_DIR / name).read_text(encoding="utf-8"))


def seed_people(db: Session) -> tuple[int, int]:
    photos_to = settings.media_dir / "people"
    photos_to.mkdir(parents=True, exist_ok=True)
    created = updated = 0
    for item in _load("people.json"):
        Title(item["title"])  # an unknown title stops the seed here rather than breaking the API later
        photo = item["photo"]
        if photo:
            shutil.copyfile(SEED_DIR / "photos" / photo, photos_to / photo)
        values = {
            "name": item["name"],
            "card_name": item.get("card_name"),
            "title": item["title"],
            "position": item["position"],
            "photo": f"people/{photo}" if photo else None,
            **{f"{key}_url": item["links"].get(key) for key in LINK_KEYS},
        }
        person = db.scalar(select(Person).where(Person.slug == item["slug"]))
        if person is None:
            db.add(Person(slug=item["slug"], **values))
            created += 1
        else:
            for field, value in values.items():
                setattr(person, field, value)
            updated += 1
    db.flush()  # the themes below refer to the people by their ids
    return created, updated


def _copy_highlight_image(name: str | None) -> str | None:
    """Puts a highlight card's picture (seed/highlights) in the media folder; returns the path the database keeps."""
    if not name:
        return None
    target = settings.media_dir / "highlights" / name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(SEED_DIR / "highlights" / name, target)
    return f"highlights/{name}"


def seed_themes(db: Session) -> int:
    people = {person.slug: person for person in db.scalars(select(Person))}
    for item in _load("themes.json"):
        theme = db.scalar(select(Theme).where(Theme.slug == item["slug"]))
        if theme is None:
            theme = Theme(slug=item["slug"])
            db.add(theme)
        theme.name = item["name"]
        theme.short_name = item["short_name"]
        theme.position = item["position"]
        theme.intro = item["intro"]
        theme.home_summary = item["home_summary"]
        theme.funded_blurb = item["funded_blurb"]

        # everything under the theme is written afresh, so the file is the whole truth about it: the old rows are deleted first (flushed), else the new ones
        # would meet them in the unique "one highlight of a kind per theme"
        theme.highlights, theme.groups, theme.projects, theme.contacts = [], [], [], []
        db.flush()
        theme.highlights = [Highlight(kind=kind, **{**h, "image": _copy_highlight_image(h["image"])}) for kind, h in item["highlights"].items()]
        theme.groups = [
            TopicGroup(
                title=g["title"],
                position=i,
                topics=[Topic(text=text, position=j) for j, text in enumerate(g["topics"])],
                members=[TopicGroupPerson(person=people[slug], position=j) for j, slug in enumerate(g["people"])],
            )
            for i, g in enumerate(item["groups"])
        ]
        theme.projects = [
            Project(status=status, position=i, **p) for status in ("ongoing", "ended") for i, p in enumerate(item["projects"][status])
        ]
        theme.contacts = [ThemeContact(person=people[slug], position=i) for i, slug in enumerate(item["refer_to"])]
    return len(_load("themes.json"))


def seed_pages(db: Session) -> int:
    pages = json.loads((SEED_DIR / "pages.json").read_text(encoding="utf-8"))
    for slug, intro in pages.items():
        page = db.get(PageText, slug)
        if page is None:
            db.add(PageText(slug=slug, intro=intro))
        else:
            page.intro = intro
    return len(pages)


def seed_site(db: Session) -> None:
    """The footer's phone and fax numbers (one row)."""
    data = json.loads((SEED_DIR / "site.json").read_text(encoding="utf-8"))
    contact = db.get(SiteContact, 1) or SiteContact(id=1)
    contact.phone, contact.fax = data["phone"], data["fax"]
    db.add(contact)


def seed_collaborations(db: Session) -> tuple[int, int]:
    data = json.loads((SEED_DIR / "collaborations.json").read_text(encoding="utf-8"))
    db.execute(delete(Collaborator))
    db.execute(delete(JointProject))
    walls = {
        CollaboratorKind.UNIVERSITY: data["universities"],
        CollaboratorKind.INSTITUTE: data["institutes"],
        CollaboratorKind.COMPANY: data["companies"],
    }
    count = 0
    for kind, wall in walls.items():
        for position, item in enumerate(wall):
            logo = item["logo"]  # e.g. "universities/brown.png": the folder of its wall, then the file
            if logo:
                target = settings.media_dir / "collaborators" / logo
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(SEED_DIR / "logos" / logo, target)
            db.add(Collaborator(kind=kind, name=item["name"], url=item["url"], logo=f"collaborators/{logo}" if logo else None, position=position))
            count += 1
    for position, project in enumerate(data["joint_projects"]):
        db.add(JointProject(position=position, **project))
    return count, len(data["joint_projects"])


if __name__ == "__main__":
    with SessionLocal() as session:
        created, updated = seed_people(session)
        themes = seed_themes(session)
        collaborators, joint_projects = seed_collaborations(session)
        pages = seed_pages(session)
        seed_site(session)
        session.commit()
    print(f"people: {created} added, {updated} updated; themes: {themes} written; collaborators: {collaborators}, joint projects: {joint_projects} written; page texts: {pages}; footer numbers set")
