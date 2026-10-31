"""The admin's routes for the developer: the activity log and the status of the system (grant `system`). They only read. They turn a request into a call of app/services/system.py and its
answer into an HTTP one; nothing is kept by a cache."""
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.dependencies import get_db, require_ready_user
from app.models.user import User
from app.schemas.admin import AuditPageRead, SystemStatusRead
from app.services import system as service
from app.services.grants import NotAllowed

router = APIRouter(prefix="/admin", tags=["admin: system"], dependencies=[Depends(require_ready_user)])

NO_STORE = {"Cache-Control": "no-store"}


def _not_allowed() -> HTTPException:
    return HTTPException(403, {"code": "not_allowed", "message": "Your account may not do this."})


@router.get("/audit", response_model=AuditPageRead)
def activity_log(
    response: Response,
    limit: int = Query(50, ge=1, le=service.PAGE_MAX),
    before: int | None = Query(None, ge=1, description="the id of the last entry of the page before; only older entries come back"),
    action: str | None = Query(None, max_length=60, description="only the actions that start with this, e.g. person."),
    user: str | None = Query(None, max_length=254, description="only the users whose email contains this"),
    actor: User = Depends(require_ready_user),
    db: Session = Depends(get_db),
):
    """Who changed what, and when: the newest first, a page at a time (grant `system`)."""
    response.headers.update(NO_STORE)
    try:
        page = service.audit_page(db, actor, limit, before, action, user)
    except NotAllowed:
        raise _not_allowed() from None
    return AuditPageRead(entries=page.entries, next_before=page.next_before, actions=page.actions)


@router.get("/system", response_model=SystemStatusRead)
def system_status(response: Response, actor: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """How the system is doing: the database, the link check, the uploaded files, the accounts, the requests waiting and the size of the content (grant `system`)."""
    response.headers.update(NO_STORE)
    try:
        return service.status(db, actor)
    except NotAllowed:
        raise _not_allowed() from None
