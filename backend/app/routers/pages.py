from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.page import PageText

router = APIRouter(prefix="/pages", tags=["pages"])


class PageRead(BaseModel):
    slug: str
    intro: str


@router.get("/{slug}", response_model=PageRead)
def get_page(slug: str, db: Session = Depends(get_db)):
    """The fixed words of a page: the paragraph under its title (the People page's, for one)."""
    page = db.get(PageText, slug)
    if page is None:
        raise HTTPException(status_code=404, detail="Page not found")
    return PageRead(slug=page.slug, intro=page.intro)
