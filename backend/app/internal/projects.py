"""The admin's routes for the funded projects: for the funded-projects owner (the grant `projects`). They only turn a request into a call of app/services/projects.py and its answer into
an HTTP one: who may do what, the validation and the audit row are the service's. Every route needs a login, and a route that changes something also passes the cross-site check.
There is no route that deletes a project: a project that is over is marked ended."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.validation import InvalidInput
from app.dependencies import check_origin, get_db, require_ready_user
from app.models.user import User
from app.schemas.admin import AdminProjectRead, ProjectIn, ProjectPatch
from app.services import projects as service
from app.services.grants import NotAllowed

router = APIRouter(prefix="/admin/projects", tags=["admin: projects"], dependencies=[Depends(check_origin), Depends(require_ready_user)])


def _http(error: Exception) -> HTTPException:
    """The HTTP answer for what the service refused. The body is always {"detail": {"code": ..., "message": ...}} with the field where there is one."""
    if isinstance(error, NotAllowed):
        return HTTPException(403, {"code": "not_allowed", "message": "Your account may not do this."})
    if isinstance(error, InvalidInput):
        return HTTPException(422, {"code": "invalid_input", "field": error.field, "message": error.message})
    if isinstance(error, service.ProjectNotFound):
        return HTTPException(404, {"code": "project_not_found", "message": "Project not found."})
    raise error


_REFUSALS = (NotAllowed, InvalidInput, service.ProjectNotFound)


@router.get("", response_model=list[AdminProjectRead])
def list_projects(user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """Every project of every theme: by theme, ongoing before ended, in the order the pages show them."""
    try:
        return [AdminProjectRead.from_model(project) for project in service.list_projects(db, user)]
    except _REFUSALS as error:
        raise _http(error) from None


@router.get("/{project_id}", response_model=AdminProjectRead)
def get_project(project_id: int, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    try:
        return AdminProjectRead.from_model(service.get_project(db, user, project_id))
    except _REFUSALS as error:
        raise _http(error) from None


@router.post("", response_model=AdminProjectRead, status_code=201)
def add_project(body: ProjectIn, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """Add a project to a theme (`theme` is its slug). It goes last in its list, and the numbers of the theme's pages count it at once."""
    try:
        return AdminProjectRead.from_model(service.add_project(db, user, body.model_dump()))
    except _REFUSALS as error:
        raise _http(error) from None


@router.patch("/{project_id}", response_model=AdminProjectRead)
def update_project(project_id: int, body: ProjectPatch, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """Change what is sent. A `code` or `url` sent as null or empty is removed. A project that is over is changed to `status` ended; it is never deleted."""
    try:
        return AdminProjectRead.from_model(service.update_project(db, user, project_id, body.model_dump(exclude_unset=True)))
    except _REFUSALS as error:
        raise _http(error) from None
