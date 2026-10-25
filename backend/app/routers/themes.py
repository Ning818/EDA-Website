from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.dependencies import get_db
from app.models.theme import Theme, ThemeContact, TopicGroup, TopicGroupPerson
from app.schemas.theme import ThemeRead, ThemeSummary

router = APIRouter(prefix="/themes", tags=["themes"])


@router.get("", response_model=list[ThemeSummary])
def list_themes(db: Session = Depends(get_db)):
    """The four themes, in the order of the site."""
    return db.scalars(select(Theme).order_by(Theme.position)).all()


@router.get("/{slug}", response_model=ThemeRead)
def get_theme(slug: str, db: Session = Depends(get_db)):
    """Everything the Research page and the Funded Projects page of a theme show: its words, research areas with their topics and people, projects and contacts."""
    statement = (
        select(Theme)
        .where(Theme.slug == slug)
        .options(
            selectinload(Theme.highlights),
            selectinload(Theme.groups).selectinload(TopicGroup.topics),
            selectinload(Theme.groups).selectinload(TopicGroup.members).selectinload(TopicGroupPerson.person),
            selectinload(Theme.projects),
            selectinload(Theme.contacts).selectinload(ThemeContact.person),
        )
    )
    theme = db.scalar(statement)
    if theme is None:
        raise HTTPException(status_code=404, detail="Theme not found")
    return ThemeRead.from_model(theme)
