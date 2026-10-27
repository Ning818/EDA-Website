"""The admin's route that lists the research areas of the themes: what a user chooses from when they list a person under an area. It only turns the service's answer into a response;
which areas a user is shown is decided by their grants (app/services/people.py)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies import check_origin, get_db, require_ready_user
from app.models.user import User
from app.schemas.admin import ResearchAreaRead
from app.services import people as service

router = APIRouter(prefix="/admin/research-areas", tags=["admin: research areas"], dependencies=[Depends(check_origin), Depends(require_ready_user)])


@router.get("", response_model=list[ResearchAreaRead])
def list_research_areas(user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """The research areas the user may list people under (those of the themes they hold the grant `theme` for), in the order of the site; none for a user with no such grant."""
    return [ResearchAreaRead(**vars(area)) for area in service.research_areas(db, user)]
