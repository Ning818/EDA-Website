"""The admin's routes for the site's own words: the footer's numbers and the paragraph under the title of the People and Collaborations pages, for the administrative staff (the grant
`site`). They only turn a request into a call of app/services/site.py and its answer into an HTTP one."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.validation import InvalidInput
from app.dependencies import check_origin, get_db, require_ready_user
from app.models.user import User
from app.schemas.admin import PageIntroIn, PageIntroRead, SiteContactPatch
from app.schemas.site import SiteRead
from app.services import site as service
from app.services.grants import NotAllowed

router = APIRouter(prefix="/admin/site", tags=["admin: site"], dependencies=[Depends(check_origin), Depends(require_ready_user)])


def _http(error: Exception) -> HTTPException:
    if isinstance(error, NotAllowed):
        return HTTPException(403, {"code": "not_allowed", "message": "Your account may not do this."})
    if isinstance(error, InvalidInput):
        return HTTPException(422, {"code": "invalid_input", "field": error.field, "message": error.message})
    if isinstance(error, service.PageNotFound):
        return HTTPException(404, {"code": "page_not_found", "message": "Page not found."})
    raise error


_REFUSALS = (NotAllowed, InvalidInput, service.PageNotFound)


@router.patch("/contact", response_model=SiteRead)
def update_contact(body: SiteContactPatch, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """Change the footer's phone and fax numbers: only the fields sent change, and a number sent as null or empty is removed (the footer then leaves that line out)."""
    try:
        return SiteRead.from_model(service.update_contact(db, user, body.model_dump(exclude_unset=True)))
    except _REFUSALS as error:
        raise _http(error) from None


@router.put("/pages/{slug}", response_model=PageIntroRead)
def set_page_intro(slug: str, body: PageIntroIn, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """Write the paragraph under the title of a page (`people` or `collaborations`)."""
    try:
        page = service.set_page_intro(db, user, slug, body.intro)
        return PageIntroRead(slug=page.slug, intro=page.intro)
    except _REFUSALS as error:
        raise _http(error) from None
