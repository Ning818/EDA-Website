"""The admin's routes for people. They only turn a request into a call of app/services/people.py and its answer into an HTTP one: who may do what, the validation and the audit
row are the service's. Every route needs a login, and a route that changes something also passes the cross-site check."""
from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from sqlalchemy.orm import Session

from app.core.validation import InvalidInput
from app.dependencies import check_origin, get_db, require_ready_user
from app.models.grant import Area
from app.models.person import Person
from app.models.user import User
from app.schemas.admin import AdminPersonRead, AffectedRead, DeleteImpactRead, TopicMembershipRead
from app.schemas.person import PersonRead
from app.services import people as service
from app.services import photos
from app.services.grants import NotAllowed, has_grant

router = APIRouter(prefix="/admin/people", tags=["admin: people"], dependencies=[Depends(check_origin), Depends(require_ready_user)])


def _http(error: Exception) -> HTTPException:
    """The HTTP answer for what the service refused. The body is always {"detail": {"code": ..., "message": ...}} with more where a screen needs it."""
    if isinstance(error, NotAllowed):
        return HTTPException(403, {"code": "not_allowed", "message": "Your account may not do this."})
    if isinstance(error, InvalidInput):
        return HTTPException(422, {"code": "invalid_input", "field": error.field, "message": error.message})
    if isinstance(error, photos.PhotoTooLarge):
        return HTTPException(413, {"code": "photo_too_large", "message": str(error)})
    if isinstance(error, photos.InvalidPhoto):
        return HTTPException(422, {"code": "photo_invalid", "message": str(error)})
    if isinstance(error, service.PhotoConsentRequired):
        return HTTPException(422, {"code": "photo_consent_required", "message": "Confirm that the person agreed to the photo being used."})
    if isinstance(error, service.PossibleDuplicate):
        return HTTPException(
            409,
            {
                "code": "possible_duplicate",
                "message": "Someone with this name is in the list already. Confirm that this is a different person to add them.",
                "matches": [PersonRead.from_model(person).model_dump(mode="json") for person in error.matches],
            },
        )
    if isinstance(error, service.LeaveNeedsConfirmation):
        return HTTPException(
            409,
            {
                "code": "leave_needs_confirmation",
                "message": "The person is a contact of these themes and will be taken out of them. Confirm to go on.",
                "affected": [AffectedRead(**vars(a)).model_dump() for a in error.affected],
            },
        )
    if isinstance(error, service.DeleteNeedsConfirmation):
        return HTTPException(
            409,
            {
                "code": "delete_needs_confirmation",
                "message": "Deleting the person also removes them from these contacts and topics. Confirm to go on.",
                "impact": _impact(error.impact).model_dump(),
            },
        )
    if isinstance(error, service.PersonNotFound):
        return HTTPException(404, {"code": "person_not_found", "message": "Person not found."})
    raise error


def _impact(impact: service.DeleteImpact) -> DeleteImpactRead:
    return DeleteImpactRead(refer_to=[AffectedRead(**vars(a)) for a in impact.refer_to], topics=[TopicMembershipRead(**vars(t)) for t in impact.topics])


_REFUSALS = (
    NotAllowed,
    InvalidInput,
    photos.InvalidPhoto,
    service.PhotoConsentRequired,
    service.PossibleDuplicate,
    service.LeaveNeedsConfirmation,
    service.DeleteNeedsConfirmation,
    service.PersonNotFound,
)


def _read_photo(photo: UploadFile | None) -> bytes | None:
    """The uploaded bytes, read up to one byte past the limit (the service refuses a photo that big); an empty file part means no photo was chosen."""
    if photo is None:
        return None
    return photo.file.read(photos.MAX_BYTES + 1) or None


CLEARABLE = ("card_name", "polito", "orcid", "linkedin", "dept", "iris")


def _given(**values: str | None) -> dict:
    """Only the fields that were sent (a form field sent empty arrives as not sent, so removing one is done with `clear`)."""
    return {key: value for key, value in values.items() if value is not None}


def _admin_read(db: Session, actor: User, person: Person) -> AdminPersonRead:
    can_edit = service.can_edit_person(db, actor, person)
    by_window = can_edit and not has_grant(db, actor, Area.PEOPLE_EDIT)
    return AdminPersonRead(
        **PersonRead.from_model(person).model_dump(),
        can_edit=can_edit,
        can_delete=service.can_delete_person(db, actor, person),
        editable_until=service.editable_until(person) if by_window else None,
    )


@router.get("/{slug}", response_model=AdminPersonRead)
def get_person(slug: str, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """A person with whether this user may change them."""
    try:
        return _admin_read(db, user, service.get_person(db, slug))
    except _REFUSALS as error:
        raise _http(error) from None


@router.get("/{slug}/leave-preview", response_model=list[AffectedRead])
def leave_preview(slug: str, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """The themes that would lose this person as a contact if they left; empty where none would (or they have left already)."""
    try:
        return [AffectedRead(**vars(a)) for a in service.leave_preview(db, user, slug)]
    except _REFUSALS as error:
        raise _http(error) from None


@router.get("/{slug}/delete-preview", response_model=DeleteImpactRead)
def delete_preview(slug: str, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """The contacts and the topic groups that would lose this person if they were deleted (grant `people_delete`, or the one who added the person, for a day)."""
    try:
        return _impact(service.delete_preview(db, user, slug))
    except _REFUSALS as error:
        raise _http(error) from None


@router.delete("/{slug}", status_code=204)
def delete_person(slug: str, confirm: bool = False, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """Delete a person, for one added by mistake (grant `people_delete`, or the one who added the person, for a day). Asked without `confirm=true` it only says what would go (409); a member
    who left is made a Former member instead."""
    try:
        service.delete_person(db, user, slug, confirm)
    except _REFUSALS as error:
        raise _http(error) from None
    return Response(status_code=204)


@router.post("", response_model=AdminPersonRead, status_code=201)
def add_person(
    name: str = Form(""),
    title: str = Form(""),
    card_name: str | None = Form(None),
    polito: str | None = Form(None),
    orcid: str | None = Form(None),
    linkedin: str | None = Form(None),
    dept: str | None = Form(None),
    iris: str | None = Form(None),
    photo: UploadFile | None = File(None),
    photo_consent: bool = Form(False),
    confirm_distinct: bool = Form(False),
    user: User = Depends(require_ready_user),
    db: Session = Depends(get_db),
):
    """Add a person; they show on the People page at once. A photo needs `photo_consent`; a name that is in the list already is refused (409) until `confirm_distinct`."""
    fields = _given(name=name, title=title, card_name=card_name, polito=polito, orcid=orcid, linkedin=linkedin, dept=dept, iris=iris)
    try:
        person = service.add_person(db, user, fields, _read_photo(photo), photo_consent, confirm_distinct)
        return _admin_read(db, user, person)
    except _REFUSALS as error:
        raise _http(error) from None


@router.patch("/{slug}", response_model=AdminPersonRead)
def update_person(
    slug: str,
    name: str | None = Form(None),
    title: str | None = Form(None),
    card_name: str | None = Form(None),
    polito: str | None = Form(None),
    orcid: str | None = Form(None),
    linkedin: str | None = Form(None),
    dept: str | None = Form(None),
    iris: str | None = Form(None),
    photo: UploadFile | None = File(None),
    photo_consent: bool = Form(False),
    clear: list[str] = Form([]),
    confirm_leave: bool = Form(False),
    user: User = Depends(require_ready_user),
    db: Session = Depends(get_db),
):
    """Change what is sent; `clear` names the optional fields to remove (card_name, polito, orcid, linkedin, dept, iris), because a field sent empty counts as not sent. The title
    "Former member" lets the person leave: asked first (409), then done with `confirm_leave`."""
    fields = _given(name=name, title=title, card_name=card_name, polito=polito, orcid=orcid, linkedin=linkedin, dept=dept, iris=iris)
    try:
        for key in clear:
            if key not in CLEARABLE:
                raise InvalidInput("clear", "Only card_name, polito, orcid, linkedin, dept and iris can be cleared.")
            fields[key] = ""
        person = service.update_person(db, user, slug, fields, _read_photo(photo), photo_consent, confirm_leave)
        return _admin_read(db, user, person)
    except _REFUSALS as error:
        raise _http(error) from None
