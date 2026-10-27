from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Title(StrEnum):
    """A person's title, as the People page writes it."""

    FULL_PROFESSOR = "Full Professor"
    ASSOCIATE_PROFESSOR = "Associate Professor"
    ASSISTANT_PROFESSOR = "Assistant Professor"
    RESEARCH_FELLOW = "Research Fellow"
    PHD_STUDENT = "PhD Student"
    FORMER_MEMBER = "Former member"


class Group(StrEnum):
    """The three groups of the People page, in the order the page shows them."""

    PROFESSORS = "professors"
    PHD_STUDENTS = "phd-students"
    ALUMNI = "alumni"


# The group is not stored: it follows from the title, so the two cannot disagree.
GROUP_OF_TITLE = {
    Title.FULL_PROFESSOR: Group.PROFESSORS,
    Title.ASSOCIATE_PROFESSOR: Group.PROFESSORS,
    Title.ASSISTANT_PROFESSOR: Group.PROFESSORS,
    Title.RESEARCH_FELLOW: Group.PHD_STUDENTS,
    Title.PHD_STUDENT: Group.PHD_STUDENTS,
    Title.FORMER_MEMBER: Group.ALUMNI,
}

# The title as it is written on the small cards (the Research pages' "Involved people", the Funded Projects pages' "Refer to").
SHORT_TITLE = {
    Title.FULL_PROFESSOR: "Full Prof.",
    Title.ASSOCIATE_PROFESSOR: "Assoc. Prof.",
    Title.ASSISTANT_PROFESSOR: "Asst. Prof.",
    Title.RESEARCH_FELLOW: "Research Fellow",
    Title.PHD_STUDENT: "PhD Student",
    Title.FORMER_MEMBER: "Former member",
}


def titles_in(group: Group) -> list[Title]:
    return [title for title, g in GROUP_OF_TITLE.items() if g == group]


class Person(Base):
    __tablename__ = "people"

    id: Mapped[int] = mapped_column(primary_key=True)
    # the person's name in lower case, words joined by hyphens; the address of the person in the API
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(150))
    # how the small cards write the name where it differs: a middle name cut to its initial (none: the name as it is)
    card_name: Mapped[str | None] = mapped_column(String(150))
    title: Mapped[str] = mapped_column(String(50))
    # the place in the person's group on the People page (0 is the first)
    position: Mapped[int] = mapped_column(Integer, default=0)
    # the photo's path under the media folder, e.g. "people/enrico-macii.png"; none: the page shows the person's initials
    photo: Mapped[str | None] = mapped_column(String(255))

    # the person's pages elsewhere; none where the person has no such page
    polito_url: Mapped[str | None] = mapped_column(String(500))
    orcid_url: Mapped[str | None] = mapped_column(String(500))
    linkedin_url: Mapped[str | None] = mapped_column(String(500))
    dept_url: Mapped[str | None] = mapped_column(String(500))
    iris_url: Mapped[str | None] = mapped_column(String(500))

    # who added the person through the admin (none: from the seed, or the account is gone); that user may correct the entry for a day (app/services/people.py)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    # who confirmed that the person agreed to the photo being used, and when; none where there is no photo or it came with the seed
    photo_consent_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    photo_consent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
