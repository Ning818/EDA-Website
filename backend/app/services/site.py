"""The site's own words that the administrative staff keep: the phone and fax numbers of the footer, and the paragraph under the title of the People and Collaborations pages. The admin
routes (app/internal/site.py) call it, and so could a script. It checks who may do what, validates every field and writes the audit row in the same transaction as the change.

Rules kept here, so that no way in can skip them:
- Everything here needs the grant `site`.
- A number is checked for being a phone number (6 to 15 digits, with only the spaces and signs a number has), because a visitor dials it with one tap; either may be left empty, and the
  footer then leaves that line out.
- A paragraph is plain text (no HTML) of at most 1000 characters, so that it cannot break the page, and is never empty. Only the pages that have a paragraph can be written; none is
  made here.
- The words of the home page's two social media blocks (`social_links`: YouTube and LinkedIn) are written whole, each on its own: a label, a text, the words of a button and an address,
  all required; the address is an http(s) one, since it is where a visitor is sent and where the footer's icon leads. There are exactly these two blocks: none is added or taken away,
  because the home page's animation has a stage for each.
- A change that changes nothing writes no audit row.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.validation import InvalidInput, clean_phone, clean_text, clean_url
from app.models.grant import Area
from app.models.page import PageText
from app.models.site import SiteContact, SocialLink
from app.models.user import User
from app.services import audit
from app.services.grants import require

INTRO_MAX = 1000
SOCIAL_SLUGS = ("youtube", "linkedin")
SOCIAL_LABEL_MAX = 30
SOCIAL_TEXT_MAX = 450
SOCIAL_CTA_MAX = 60


class PageNotFound(LookupError):
    pass


def update_contact(db: Session, actor: User, fields: dict) -> SiteContact:
    """Change the footer's numbers: only `phone` and `fax` given change, and one given empty is removed."""
    require(db, actor, Area.SITE)
    clean = {}
    for key, label in (("phone", "The phone number"), ("fax", "The fax number")):
        if key in fields:
            clean[key] = clean_phone(fields[key], key, label=label)
    contact = db.scalar(select(SiteContact).order_by(SiteContact.id))
    before = {"phone": contact.phone if contact else None, "fax": contact.fax if contact else None}
    after = {**before, **clean}
    if after == before:
        return contact or SiteContact(id=1, **before)
    if contact is None:
        contact = SiteContact(id=1)
        db.add(contact)
    contact.phone, contact.fax = after["phone"], after["fax"]
    audit.record(db, actor, "site.contact", "site", "contact", before=before, after=after)
    db.commit()
    return contact


def set_page_intro(db: Session, actor: User, slug: str, text: str | None) -> PageText:
    """Write the paragraph under the title of a page ('people' or 'collaborations')."""
    require(db, actor, Area.SITE)
    page = db.get(PageText, slug)
    if page is None:
        raise PageNotFound(slug)
    clean = clean_text(text, "intro", label="The paragraph", max_length=INTRO_MAX, required=True)
    if clean == page.intro:
        return page
    before = page.intro
    page.intro = clean
    audit.record(db, actor, "page.intro", "page", slug, before={"intro": before}, after={"intro": clean})
    db.commit()
    return page


class SocialNotFound(LookupError):
    pass


def social_snapshot(link: SocialLink) -> dict:
    return {"label": link.label, "text": link.text, "cta": link.cta, "url": link.url}


def update_social(db: Session, actor: User, slug: str, fields: dict) -> SocialLink:
    """Write one social media block whole (`label`, `text`, `cta`, `url`)."""
    require(db, actor, Area.SITE)
    link = db.get(SocialLink, slug) if slug in SOCIAL_SLUGS else None
    if link is None:
        raise SocialNotFound(slug)
    clean = {
        "label": clean_text(fields.get("label"), "label", label="The heading", max_length=SOCIAL_LABEL_MAX, required=True),
        "text": clean_text(fields.get("text"), "text", label="The text", max_length=SOCIAL_TEXT_MAX, required=True),
        "cta": clean_text(fields.get("cta"), "cta", label="The words of the button", max_length=SOCIAL_CTA_MAX, required=True),
        "url": clean_url(fields.get("url"), "url", label="The address"),
    }
    if clean["url"] is None:
        raise InvalidInput("url", "The address is required.")
    before = social_snapshot(link)
    if clean == before:
        return link
    for key, value in clean.items():
        setattr(link, key, value)
    audit.record(db, actor, "social.update", "social", slug, before=before, after=clean)
    db.commit()
    return link
