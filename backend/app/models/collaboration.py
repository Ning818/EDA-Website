from enum import StrEnum

from sqlalchemy import Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CollaboratorKind(StrEnum):
    """The three logo walls of the Collaborations page."""

    UNIVERSITY = "university"
    INSTITUTE = "institute"
    COMPANY = "company"


class Collaborator(Base):
    """An organisation the group collaborates with: a logo card that links to the organisation's own website."""

    __tablename__ = "collaborators"
    __table_args__ = (UniqueConstraint("kind", "name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(20), index=True)
    name: Mapped[str] = mapped_column(String(200))
    # the organisation's own website; for a company the address of its Italian or English site, not its bare domain (which can send visitors to the site of another country)
    url: Mapped[str | None] = mapped_column(String(500))
    # the logo's path under the media folder, e.g. "collaborators/universities/brown.png"
    logo: Mapped[str | None] = mapped_column(String(255))
    # the place in its wall (0 is the first)
    position: Mapped[int] = mapped_column(Integer, default=0)


class JointProject(Base):
    """A project the group took part in with collaborators, from the project's record on CORDIS (the EU's research information service)."""

    __tablename__ = "joint_projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(Text)
    funding: Mapped[str] = mapped_column(String(100))
    years: Mapped[str] = mapped_column(String(20))
    coordinator: Mapped[str] = mapped_column(String(200))
    # the project's other partners that are among the collaborators (as the record names them)
    partners: Mapped[list[str]] = mapped_column(ARRAY(String(200)), default=list)
    url: Mapped[str] = mapped_column(String(500))
    position: Mapped[int] = mapped_column(Integer, default=0)
