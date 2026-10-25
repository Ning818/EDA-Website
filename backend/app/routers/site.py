from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.site import SiteContact
from app.schemas.site import SiteRead

router = APIRouter(prefix="/site", tags=["site"])


@router.get("", response_model=SiteRead)
def get_site(db: Session = Depends(get_db)):
    """The phone and fax numbers the footer of every page shows."""
    contact = db.scalar(select(SiteContact).order_by(SiteContact.id))
    if contact is None:
        raise HTTPException(status_code=404, detail="The site's contact details are not set")
    return SiteRead.from_model(contact)
