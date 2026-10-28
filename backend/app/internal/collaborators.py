"""The admin's routes for the collaborators of the logo walls: for the administrative staff (the grant `site`). They only turn a request into a call of app/services/collaborations.py and
its answer into an HTTP one: who may do what, the validation, the logo and the audit row are the service's. Every route needs a login, and a route that changes something also passes
the cross-site check."""
from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from sqlalchemy.orm import Session

from app.core.validation import InvalidInput
from app.dependencies import check_origin, get_db, require_ready_user
from app.models.user import User
from app.schemas.admin import AdminCollaboratorRead
from app.services import collaborations as service
from app.services import photos
from app.services.grants import NotAllowed

router = APIRouter(prefix="/admin/collaborators", tags=["admin: collaborators"], dependencies=[Depends(check_origin), Depends(require_ready_user)])


def _http(error: Exception) -> HTTPException:
    """The HTTP answer for what the service refused. The body is always {"detail": {"code": ..., "message": ...}} with the field where there is one."""
    if isinstance(error, NotAllowed):
        return HTTPException(403, {"code": "not_allowed", "message": "Your account may not do this."})
    if isinstance(error, InvalidInput):
        return HTTPException(422, {"code": "invalid_input", "field": error.field, "message": error.message})
    if isinstance(error, photos.PhotoTooLarge):
        return HTTPException(413, {"code": "logo_too_large", "message": str(error)})
    if isinstance(error, photos.InvalidPhoto):
        return HTTPException(422, {"code": "logo_invalid", "message": str(error)})
    if isinstance(error, service.NameTaken):
        return HTTPException(409, {"code": "name_taken", "message": "There is a collaborator with this name in that wall already."})
    if isinstance(error, service.CollaboratorNotFound):
        return HTTPException(404, {"code": "collaborator_not_found", "message": "Collaborator not found."})
    raise error


_REFUSALS = (NotAllowed, InvalidInput, photos.InvalidPhoto, service.NameTaken, service.CollaboratorNotFound)

CLEARABLE = ("url",)


def _read_logo(logo: UploadFile | None) -> bytes | None:
    """The uploaded bytes, read up to one byte past the limit (the service refuses a file that big); an empty file part means no logo was chosen."""
    if logo is None:
        return None
    return logo.file.read(photos.MAX_BYTES + 1) or None


def _given(**values: str | None) -> dict:
    """Only the fields that were sent (a form field sent empty arrives as not sent, so removing one is done with `clear`)."""
    return {key: value for key, value in values.items() if value is not None}


@router.get("", response_model=list[AdminCollaboratorRead])
def list_collaborators(user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """Every collaborator, wall by wall in the order of the page (universities, institutes, companies), each wall in its own order."""
    try:
        return [AdminCollaboratorRead.from_model(c) for c in service.list_collaborators(db, user)]
    except _REFUSALS as error:
        raise _http(error) from None


@router.get("/{collaborator_id}", response_model=AdminCollaboratorRead)
def get_collaborator(collaborator_id: int, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    try:
        return AdminCollaboratorRead.from_model(service.get_collaborator(db, user, collaborator_id))
    except _REFUSALS as error:
        raise _http(error) from None


@router.post("", response_model=AdminCollaboratorRead, status_code=201)
def add_collaborator(
    kind: str = Form(""),
    name: str = Form(""),
    url: str | None = Form(None),
    logo: UploadFile | None = File(None),
    user: User = Depends(require_ready_user),
    db: Session = Depends(get_db),
):
    """Add a collaborator to a wall (`kind`: university, institute or company); it goes last there. The logo is required. A name that is in the wall already is refused (409)."""
    try:
        return AdminCollaboratorRead.from_model(service.add_collaborator(db, user, _given(kind=kind, name=name, url=url), _read_logo(logo)))
    except _REFUSALS as error:
        raise _http(error) from None


@router.patch("/{collaborator_id}", response_model=AdminCollaboratorRead)
def update_collaborator(
    collaborator_id: int,
    kind: str | None = Form(None),
    name: str | None = Form(None),
    url: str | None = Form(None),
    logo: UploadFile | None = File(None),
    clear: list[str] = Form([]),
    user: User = Depends(require_ready_user),
    db: Session = Depends(get_db),
):
    """Change what is sent; `clear` names what to remove (url), because a field sent empty counts as not sent. A new logo replaces the old one, and a logo cannot be taken away. A
    change of kind moves the collaborator to the end of the other wall."""
    fields = _given(kind=kind, name=name, url=url)
    try:
        for key in clear:
            if key not in CLEARABLE:
                raise InvalidInput("clear", "Only url can be cleared; a collaborator keeps its logo until a new one replaces it.")
            if key == "url":
                fields["url"] = ""
        return AdminCollaboratorRead.from_model(service.update_collaborator(db, user, collaborator_id, fields, _read_logo(logo)))
    except _REFUSALS as error:
        raise _http(error) from None


@router.delete("/{collaborator_id}", status_code=204)
def delete_collaborator(collaborator_id: int, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """Remove a collaborator whose collaboration has ended or who was added by mistake. The logo file goes with it; what was kept of them is in the audit log."""
    try:
        service.delete_collaborator(db, user, collaborator_id)
    except _REFUSALS as error:
        raise _http(error) from None
    return Response(status_code=204)
