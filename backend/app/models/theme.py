from enum import StrEnum

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint, true
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.person import Person


class HighlightKind(StrEnum):
    PAPER = "paper"  # the "Highlight paper" card of a theme's Research page
    PROJECT = "project"  # the "Highlight project" card of a theme's Funded Projects page


class ProjectStatus(StrEnum):
    ONGOING = "ongoing"
    ENDED = "ended"


class Theme(Base):
    """One of the four research themes. What a theme looks like (colour, header artwork, addresses) stays in the site's code (frontend/src/themes.js); the words are here."""

    __tablename__ = "themes"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    # a shorter name for the places where the full one is too long
    short_name: Mapped[str | None] = mapped_column(String(50))
    position: Mapped[int] = mapped_column(Integer, default=0)
    # whether the theme is on the website: its template is in the front end's code, which the developer says by `python -m app.manage set-theme-live`. A theme made by the developer starts
    # without, so that the staff can write it before the public can read anything of it; the public routes do not know a theme that is not on the site
    on_site: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
    # the paragraph under the title of the theme's Research page
    intro: Mapped[str] = mapped_column(Text)
    # the shorter paragraph beside the theme's particle cloud on the home page (empty: the site shows the text it has built in)
    home_summary: Mapped[str | None] = mapped_column(Text)
    # the line in the "Funded projects" card of the Research page, about the theme's own projects
    funded_blurb: Mapped[str] = mapped_column(Text)

    highlights: Mapped[list["Highlight"]] = relationship(back_populates="theme", cascade="all, delete-orphan")
    groups: Mapped[list["TopicGroup"]] = relationship(back_populates="theme", cascade="all, delete-orphan", order_by="TopicGroup.position")
    projects: Mapped[list["Project"]] = relationship(back_populates="theme", cascade="all, delete-orphan", order_by="Project.position")
    contacts: Mapped[list["ThemeContact"]] = relationship(back_populates="theme", cascade="all, delete-orphan", order_by="ThemeContact.position")


class Highlight(Base):
    """A theme's highlight paper or highlight project. A paper has authors (in full, and by initials for the phone) and a venue; a project has a second title line."""

    __tablename__ = "highlights"
    __table_args__ = (UniqueConstraint("theme_id", "kind"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    theme_id: Mapped[int] = mapped_column(ForeignKey("themes.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(20))
    title: Mapped[str] = mapped_column(Text)
    subtitle: Mapped[str | None] = mapped_column(Text)
    authors_full: Mapped[str | None] = mapped_column(Text)
    authors_short: Mapped[str | None] = mapped_column(Text)
    venue: Mapped[str | None] = mapped_column(String(200))
    tags: Mapped[list[str]] = mapped_column(ARRAY(String(100)), default=list)
    # the card's picture (4:3): its path under the media folder, e.g. "highlights/paper-vlsi-cad.jpg"; none: the site shows a neutral placeholder
    image: Mapped[str | None] = mapped_column(String(255))
    # what the picture shows, for those who cannot see it (its text alternative); none: the site writes one from the title
    image_alt: Mapped[str | None] = mapped_column(String(300))
    text: Mapped[str] = mapped_column(Text)
    url: Mapped[str] = mapped_column(String(500))

    theme: Mapped[Theme] = relationship(back_populates="highlights")


class TopicGroup(Base):
    """A research area of a theme, with its research topics and the people whose own work lies in it."""

    __tablename__ = "topic_groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    theme_id: Mapped[int] = mapped_column(ForeignKey("themes.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    position: Mapped[int] = mapped_column(Integer, default=0)

    theme: Mapped[Theme] = relationship(back_populates="groups")
    topics: Mapped[list["Topic"]] = relationship(back_populates="group", cascade="all, delete-orphan", order_by="Topic.position")
    members: Mapped[list["TopicGroupPerson"]] = relationship(back_populates="group", cascade="all, delete-orphan", order_by="TopicGroupPerson.position")


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("topic_groups.id", ondelete="CASCADE"), index=True)
    text: Mapped[str] = mapped_column(String(300))
    position: Mapped[int] = mapped_column(Integer, default=0)

    group: Mapped[TopicGroup] = relationship(back_populates="topics")


class TopicGroupPerson(Base):
    """A person involved in a research area; `position` is the place they were written in (within a rank, the people keep it)."""

    __tablename__ = "topic_group_people"

    group_id: Mapped[int] = mapped_column(ForeignKey("topic_groups.id", ondelete="CASCADE"), primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id", ondelete="CASCADE"), primary_key=True)
    position: Mapped[int] = mapped_column(Integer, default=0)

    group: Mapped[TopicGroup] = relationship(back_populates="members")
    person: Mapped[Person] = relationship()


class Project(Base):
    """A funded project of a theme, ongoing or ended; `code` is its acronym (a few have none), `url` its own website where it still works."""

    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    theme_id: Mapped[int] = mapped_column(ForeignKey("themes.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(20))
    code: Mapped[str | None] = mapped_column(String(50))
    description: Mapped[str] = mapped_column(Text)
    # the language of the description as an ISO 639-1 code ("it"); none means English. The site writes it as `lang` on the description so that a screen reader pronounces it right
    language: Mapped[str | None] = mapped_column(String(5))
    url: Mapped[str | None] = mapped_column(String(500))
    position: Mapped[int] = mapped_column(Integer, default=0)

    theme: Mapped[Theme] = relationship(back_populates="projects")


class ThemeContact(Base):
    """A person to turn to about a theme's projects (the "Refer to" list of its Funded Projects page)."""

    __tablename__ = "theme_contacts"

    theme_id: Mapped[int] = mapped_column(ForeignKey("themes.id", ondelete="CASCADE"), primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id", ondelete="CASCADE"), primary_key=True)
    position: Mapped[int] = mapped_column(Integer, default=0)

    theme: Mapped[Theme] = relationship(back_populates="contacts")
    person: Mapped[Person] = relationship()
