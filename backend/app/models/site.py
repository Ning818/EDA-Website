from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SiteContact(Base):
    """The footer's phone and fax numbers, the part of its contact block that can change. One row only (id 1). The rest of the footer - the names, the address, the links - is in the code."""

    __tablename__ = "site_contact"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    # as they are shown ("+39 011 090 7042"); the site makes the link that dials the phone from its digits. Empty: the footer leaves that line out.
    phone: Mapped[str | None] = mapped_column(String(40))
    fax: Mapped[str | None] = mapped_column(String(40))


class SocialLink(Base):
    """One of the two social media blocks of the home page (YouTube, LinkedIn): the words beside its particle cloud and where its button leads. The address is also the one of the icon
    in the footer. There are exactly these two rows (their `slug`); the home page's animation has a stage for each, so none is added or taken away."""

    __tablename__ = "social_links"

    slug: Mapped[str] = mapped_column(String(20), primary_key=True)
    # the small heading above the text ("YouTube")
    label: Mapped[str] = mapped_column(String(30))
    text: Mapped[str] = mapped_column(Text)
    # the words of the button ("Explore our YouTube channel")
    cta: Mapped[str] = mapped_column(String(60))
    url: Mapped[str] = mapped_column(String(500))
