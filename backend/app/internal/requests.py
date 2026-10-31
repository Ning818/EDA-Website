"""The admin's routes for the "I can't find what I need" requests: any logged-in user asks and sees their own; the holders of the grant `system` (the developer) see all and answer. They only turn a
request into a call of app/services/requests.py and its answer into an HTTP one."""
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.core.validation import InvalidInput
from app.dependencies import check_origin, get_db, require_ready_user
from app.models.user import User
from app.schemas.admin import RequestCloseIn, RequestIn, RequestRead, RequestsRead
from app.services import requests as service
from app.services.grants import NotAllowed

router = APIRouter(prefix="/admin/requests", tags=["admin: requests"], dependencies=[Depends(check_origin), Depends(require_ready_user)])

NO_STORE = {"Cache-Control": "no-store"}


def _http(error: Exception) -> HTTPException:
    if isinstance(error, NotAllowed):
        return HTTPException(403, {"code": "not_allowed", "message": "Your account may not do this."})
    if isinstance(error, service.RequestNotFound):
        return HTTPException(404, {"code": "request_not_found", "message": "Request not found."})
    if isinstance(error, service.RequestError):
        return HTTPException(409, {"code": error.code, "message": error.message})
    if isinstance(error, InvalidInput):
        return HTTPException(422, {"code": "invalid_input", "field": error.field, "message": error.message})
    raise error


_REFUSALS = (NotAllowed, service.RequestNotFound, service.RequestError, InvalidInput)


def _all(rows) -> RequestsRead:
    return RequestsRead(requests=[RequestRead.model_validate(row) for row in rows], open=sum(row.status == service.OPEN for row in rows))


@router.post("", response_model=RequestRead, status_code=201)
def ask(body: RequestIn, response: Response, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """Say what you could not find or do. It goes to the developer."""
    response.headers.update(NO_STORE)
    try:
        return service.create(db, user, body.message, body.page)
    except _REFUSALS as error:
        raise _http(error) from None


@router.get("/mine", response_model=RequestsRead)
def my_requests(response: Response, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """The user's own requests, newest first, with the answers."""
    response.headers.update(NO_STORE)
    return _all(service.mine(db, user))


@router.get("", response_model=RequestsRead)
def all_requests(response: Response, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """Every request, the ones waiting first (grant `system`)."""
    response.headers.update(NO_STORE)
    try:
        return _all(service.list_all(db, user))
    except _REFUSALS as error:
        raise _http(error) from None


@router.post("/{request_id}/close", response_model=RequestRead)
def close(request_id: int, body: RequestCloseIn, response: Response, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """Mark a request as answered, with a few words for the one who asked (grant `system`)."""
    response.headers.update(NO_STORE)
    try:
        return service.close(db, user, request_id, body.answer)
    except _REFUSALS as error:
        raise _http(error) from None
