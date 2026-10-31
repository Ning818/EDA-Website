from pydantic import BaseModel, ConfigDict

from app.models.site import SiteContact, SocialLink


def dialable(phone: str | None) -> str | None:
    """The number as a phone can dial it: digits, and a + at the start if there is one ("+39 011 090 7042" -> "+390110907042"). None when there is nothing to dial."""
    if not phone:
        return None
    digits = "".join(c for c in phone if c.isdigit())
    if not digits:
        return None
    return ("+" if phone.strip().startswith("+") else "") + digits


class SiteRead(BaseModel):
    """The footer's numbers."""

    phone: str | None
    # what the "tel:" link of the phone number holds
    phone_dial: str | None
    fax: str | None

    @classmethod
    def from_model(cls, contact: SiteContact) -> "SiteRead":
        return cls(phone=contact.phone, phone_dial=dialable(contact.phone), fax=contact.fax)


class SocialRead(BaseModel):
    """One of the home page's social media blocks: its words, its button and where it leads (which is also where the footer's icon leads)."""

    model_config = ConfigDict(from_attributes=True)

    slug: str
    label: str
    text: str
    cta: str
    url: str


def social_read(link: SocialLink) -> SocialRead:
    return SocialRead.model_validate(link)
