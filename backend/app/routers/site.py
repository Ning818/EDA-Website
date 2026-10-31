from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.site import SiteContact, SocialLink
from app.schemas.site import SiteRead, SocialRead, social_read

router = APIRouter(prefix="/site", tags=["site"])


@router.get("", response_model=SiteRead)
def get_site(db: Session = Depends(get_db)):
    """The phone and fax numbers the footer of every page shows."""
    contact = db.scalar(select(SiteContact).order_by(SiteContact.id))
    if contact is None:
        raise HTTPException(status_code=404, detail="The site's contact details are not set")
    return SiteRead.from_model(contact)


@router.get("/social", response_model=list[SocialRead])
def get_social(db: Session = Depends(get_db)):
    """The two social media blocks of the home page (YouTube first, then LinkedIn): their words, their buttons and where the buttons and the footer's icons lead."""
    rows = {link.slug: link for link in db.scalars(select(SocialLink))}
    return [social_read(rows[slug]) for slug in ("youtube", "linkedin") if slug in rows]
