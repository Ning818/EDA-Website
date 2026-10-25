from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PageText(Base):
    """The fixed words of a page that is not a theme's: the paragraph under its title. `slug` names the page ('people', 'collaborations')."""

    __tablename__ = "pages"

    slug: Mapped[str] = mapped_column(String(50), primary_key=True)
    intro: Mapped[str] = mapped_column(Text)
