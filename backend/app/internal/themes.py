"""The admin's routes for what a theme page says. The theme owner (the grant `theme`) keeps its words, its contacts, its research areas with their topics and involved people, and its two
highlight cards (app/services/themes.py); the funded-projects owner (the grant `projects`) keeps the sentence about its funded projects (app/services/projects.py). The routes only turn a
request into a call of a service and its answer into an HTTP one: who may do what, the validation, the pictures and the audit rows are the services'. Every route needs a login, and a route
that changes something also passes the cross-site check."""
from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from sqlalchemy.orm import Session

from app.core.validation import InvalidInput
from app.dependencies import check_origin, get_db, require_ready_user
from app.models.user import User
from app.schemas.admin import (
    AdminAreaRead,
    AdminHighlightRead,
    AdminThemeRead,
    AdminThemeSummary,
    AdminTopicRead,
    AreaImpactRead,
    AreaIn,
    FundedBlurbIn,
    FundedBlurbRead,
    MoveIn,
    PeopleIn,
    ThemeWordsPatch,
    TopicIn,
)
from app.services import photos
from app.services import projects as projects_service
from app.services import themes as service
from app.services.grants import NotAllowed

_GUARDS = [Depends(check_origin), Depends(require_ready_user)]
router = APIRouter(prefix="/admin/themes", tags=["admin: themes"], dependencies=_GUARDS)
areas_router = APIRouter(prefix="/admin/areas", tags=["admin: research areas"], dependencies=_GUARDS)
topics_router = APIRouter(prefix="/admin/topics", tags=["admin: research topics"], dependencies=_GUARDS)


def _http(error: Exception) -> HTTPException:
    """The HTTP answer for what a service refused. The body is always {"detail": {"code": ..., "message": ...}} with the field where there is one."""
    if isinstance(error, NotAllowed):
        return HTTPException(403, {"code": "not_allowed", "message": "Your account may not do this."})
    if isinstance(error, InvalidInput):
        return HTTPException(422, {"code": "invalid_input", "field": error.field, "message": error.message})
    if isinstance(error, photos.PhotoTooLarge):
        return HTTPException(413, {"code": "image_too_large", "message": str(error)})
    if isinstance(error, photos.InvalidPhoto):
        return HTTPException(422, {"code": "image_invalid", "message": str(error)})
    if isinstance(error, projects_service.ThemeNotFound):
        return HTTPException(404, {"code": "theme_not_found", "message": "Theme not found."})
    if isinstance(error, service.AreaNotFound):
        return HTTPException(404, {"code": "area_not_found", "message": "Research area not found."})
    if isinstance(error, service.TopicNotFound):
        return HTTPException(404, {"code": "topic_not_found", "message": "Research topic not found."})
    if isinstance(error, service.DeleteNeedsConfirmation):
        return HTTPException(
            409,
            {
                "code": "delete_needs_confirmation",
                "message": "Removing the research area also removes its topics and its involved people. Confirm to go on.",
                "impact": {"topics": error.topics, "people": error.people},
            },
        )
    raise error


_REFUSALS = (
    NotAllowed,
    InvalidInput,
    photos.InvalidPhoto,
    projects_service.ThemeNotFound,
    service.AreaNotFound,
    service.TopicNotFound,
    service.DeleteNeedsConfirmation,
)


def _read_image(image: UploadFile | None) -> bytes | None:
    """The uploaded bytes, read up to one byte past the limit (the service refuses a file that big); an empty file part means no picture was chosen."""
    if image is None:
        return None
    return image.file.read(photos.MAX_BYTES + 1) or None


# --- the funded-projects owner's sentence ------------------------------------------------------------------------------------------------------------------------------


@router.put("/{theme_slug}/funded-blurb", response_model=FundedBlurbRead)
def set_funded_blurb(theme_slug: str, body: FundedBlurbIn, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """Write the sentence in the Funded projects card of the theme's Research page about its own projects (the Guided Introduction). It is written by hand and nothing changes it but this."""
    try:
        theme = projects_service.set_funded_blurb(db, user, theme_slug, body.text)
    except _REFUSALS as error:
        raise _http(error) from None
    return FundedBlurbRead(theme_slug=theme.slug, theme_name=theme.name, text=theme.funded_blurb)


# --- the theme owner's themes ------------------------------------------------------------------------------------------------------------------------------------------


@router.get("", response_model=list[AdminThemeSummary])
def list_themes(user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """The themes the user may keep (those they hold the grant `theme` for), in the order of the site; none for a user without it."""
    return service.editable_themes(db, user)


@router.get("/{slug}", response_model=AdminThemeRead)
def get_theme(slug: str, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """Everything of the theme that the theme owner keeps, with the ids that the routes for its areas and topics take."""
    try:
        return AdminThemeRead.from_model(service.get_theme(db, user, slug))
    except _REFUSALS as error:
        raise _http(error) from None


@router.patch("/{slug}", response_model=AdminThemeRead)
def update_words(slug: str, body: ThemeWordsPatch, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """Change the theme's words: name, short name, the paragraph beside its particle cloud on the home page, and the introduction of its Research page. Only what is sent changes; the short
    name and the home page paragraph sent as null or empty are removed."""
    try:
        service.update_words(db, user, slug, body.model_dump(exclude_unset=True))
        return AdminThemeRead.from_model(service.get_theme(db, user, slug))
    except _REFUSALS as error:
        raise _http(error) from None


@router.put("/{slug}/contacts", response_model=AdminThemeRead)
def set_contacts(slug: str, body: PeopleIn, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """The "Refer to" contacts of the theme: these people of the People list, in this order. A Former member is refused; none at all is allowed, and the section then disappears."""
    try:
        service.set_contacts(db, user, slug, body.people)
        return AdminThemeRead.from_model(service.get_theme(db, user, slug))
    except _REFUSALS as error:
        raise _http(error) from None


@router.post("/{slug}/areas", response_model=AdminAreaRead, status_code=201)
def add_area(slug: str, body: AreaIn, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """Add a research area to the theme; it goes last."""
    try:
        return AdminAreaRead.from_model(service.add_area(db, user, slug, body.title))
    except _REFUSALS as error:
        raise _http(error) from None


@router.put("/{slug}/highlights/{kind}", response_model=AdminHighlightRead)
def save_highlight(
    slug: str,
    kind: str,
    title: str = Form(""),
    subtitle: str | None = Form(None),
    authors_full: str | None = Form(None),
    authors_short: str | None = Form(None),
    venue: str | None = Form(None),
    tags: list[str] = Form([]),
    text: str = Form(""),
    url: str = Form(""),
    image: UploadFile | None = File(None),
    image_alt: str | None = Form(None),
    remove_image: bool = Form(False),
    user: User = Depends(require_ready_user),
    db: Session = Depends(get_db),
):
    """Write the theme's highlight card of this kind (`paper` or `project`), from all the fields of the card; everything is typed by hand. A paper has authors (in full and in short form) and a
    journal or conference, a project the second line of its title. A new `image` replaces the picture, `remove_image` takes it away, and a picture needs its text alternative `image_alt`."""
    fields = {
        "title": title,
        "subtitle": subtitle,
        "authors_full": authors_full,
        "authors_short": authors_short,
        "venue": venue,
        "tags": tags,
        "text": text,
        "url": url,
        "image_alt": image_alt,
    }
    try:
        return AdminHighlightRead.from_model(service.save_highlight(db, user, slug, kind, fields, _read_image(image), remove_image))
    except _REFUSALS as error:
        raise _http(error) from None


# --- the research areas -------------------------------------------------------------------------------------------------------------------------------------------------


@areas_router.patch("/{area_id}", response_model=AdminAreaRead)
def update_area(area_id: int, body: AreaIn, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    try:
        return AdminAreaRead.from_model(service.update_area(db, user, area_id, body.title))
    except _REFUSALS as error:
        raise _http(error) from None


@areas_router.post("/{area_id}/move", response_model=AdminAreaRead)
def move_area(area_id: int, body: MoveIn, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """Move the area one place up or down among the areas of its theme (`direction`: up or down)."""
    try:
        return AdminAreaRead.from_model(service.move_area(db, user, area_id, body.direction))
    except _REFUSALS as error:
        raise _http(error) from None


@areas_router.get("/{area_id}/delete-preview", response_model=AreaImpactRead)
def area_delete_preview(area_id: int, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """What removing the area would take with it: its topics and its involved people."""
    try:
        impact = service.area_impact(db, user, area_id)
    except _REFUSALS as error:
        raise _http(error) from None
    return AreaImpactRead(topics=impact.topics, people=impact.people)


@areas_router.delete("/{area_id}", status_code=204)
def delete_area(area_id: int, confirm: bool = False, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """Remove the area with its topics and its involved people. Asked without `confirm=true` it only says what would go (409)."""
    try:
        service.delete_area(db, user, area_id, confirm)
    except _REFUSALS as error:
        raise _http(error) from None
    return Response(status_code=204)


@areas_router.post("/{area_id}/topics", response_model=AdminTopicRead, status_code=201)
def add_topic(area_id: int, body: TopicIn, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """Add a research topic to the area; it goes last."""
    try:
        topic = service.add_topic(db, user, area_id, body.text)
    except _REFUSALS as error:
        raise _http(error) from None
    return AdminTopicRead(id=topic.id, text=topic.text)


@areas_router.put("/{area_id}/people", response_model=AdminAreaRead)
def set_area_people(area_id: int, body: PeopleIn, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """The involved people of the area: these people of the People list, in this order. Those who have left may stay."""
    try:
        return AdminAreaRead.from_model(service.set_area_people(db, user, area_id, body.people))
    except _REFUSALS as error:
        raise _http(error) from None


# --- the research topics -------------------------------------------------------------------------------------------------------------------------------------------------


@topics_router.patch("/{topic_id}", response_model=AdminTopicRead)
def update_topic(topic_id: int, body: TopicIn, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    try:
        topic = service.update_topic(db, user, topic_id, body.text)
    except _REFUSALS as error:
        raise _http(error) from None
    return AdminTopicRead(id=topic.id, text=topic.text)


@topics_router.post("/{topic_id}/move", response_model=AdminTopicRead)
def move_topic(topic_id: int, body: MoveIn, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """Move the topic one place up or down among the topics of its area (`direction`: up or down)."""
    try:
        topic = service.move_topic(db, user, topic_id, body.direction)
    except _REFUSALS as error:
        raise _http(error) from None
    return AdminTopicRead(id=topic.id, text=topic.text)


@topics_router.delete("/{topic_id}", status_code=204)
def delete_topic(topic_id: int, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    try:
        service.delete_topic(db, user, topic_id)
    except _REFUSALS as error:
        raise _http(error) from None
    return Response(status_code=204)
