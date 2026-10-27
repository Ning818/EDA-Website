"""The site's own words that the administrative staff keep: the phone and fax numbers of the footer, and the paragraph under the title of the People and Collaborations pages. The admin
routes (app/internal/site.py) call it, and so could a script. It checks who may do what, validates every field and writes the audit row in the same transaction as the change.

Rules kept here, so that no way in can skip them:
- Everything here needs the grant `site`.
- A number is checked for being a phone number (6 to 15 digits, with only the spaces and signs a number has), because a visitor dials it with one tap; either may be left empty, and the
  footer then leaves that line out.
- A paragraph is plain text (no HTML) of at most 1000 characters, so that it cannot break the page, and is never empty. Only the pages that have a paragraph can be written; none is
  made here.
- A change that changes nothing writes no audit row.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.validation import clean_phone, clean_text
from app.models.grant import Area
from app.models.page import PageText
from app.models.site import SiteContact
from app.models.user import User
from app.services import audit
from app.services.grants import require

INTRO_MAX = 1000


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
