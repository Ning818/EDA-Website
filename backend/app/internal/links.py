"""The admin's routes for the broken links: what the last checks found in the content the user keeps, and a check of one link again at once. The checks themselves run from the command line on a
schedule (app/services/links.py). Every route needs a login, and the one that asks the network also passes the cross-site check."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.dependencies import check_origin, get_db, require_ready_user
from app.models.user import User
from app.schemas.admin import LinkProblemRead, LinkProblemsRead, LinkRecheckRead
from app.services import links as service
from app.services.grants import NotAllowed

router = APIRouter(prefix="/admin/links", tags=["admin: links"], dependencies=[Depends(check_origin), Depends(require_ready_user)])


@router.get("/problems", response_model=LinkProblemsRead)
def list_problems(user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """The links that do not work in the content this user keeps (people's links for those who may change people, collaborators and joint projects for the site's staff, funded projects for their
    owner, highlight cards for the theme owner), longest broken first; none for a user who keeps nothing that has links."""
    return LinkProblemsRead(
        problems=[LinkProblemRead.model_validate(row, from_attributes=True) for row in service.problems_for(db, user)],
        last_check=service.last_check(db),
        threshold=settings.link_fail_threshold,
    )


@router.post("/problems/{check_id}/check", response_model=LinkRecheckRead)
def check_again(check_id: int, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """Check this one link again now. A good answer clears the report; a bad one counts as one more failed check."""
    try:
        row = service.recheck(db, user, check_id, fetcher=service.fetch)
    except NotAllowed:
        raise HTTPException(403, {"code": "not_allowed", "message": "Your account may not do this."}) from None
    except service.LinkNotFound:
        raise HTTPException(404, {"code": "link_not_found", "message": "That link is not in the content any more."}) from None
    return LinkRecheckRead(state=row.state, detail=row.detail, reported=row.state == service.BROKEN and row.failures >= settings.link_fail_threshold)
