from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SiteContact(Base):
    """The footer's phone and fax numbers, the part of its contact block that can change. One row only (id 1). The rest of the footer - the names, the address, the links - is in the code."""

    __tablename__ = "site_contact"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    # as they are shown ("+39 011 090 7042"); the site makes the link that dials the phone from its digits. Empty: the footer leaves that line out.
    phone: Mapped[str | None] = mapped_column(String(40))
    fax: Mapped[str | None] = mapped_column(String(40))
