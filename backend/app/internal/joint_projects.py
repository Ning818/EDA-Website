"""The admin's routes for the joint projects of the Collaborations page: for the administrative staff (the grant `site`). They only turn a request into a call of
app/services/collaborations.py and its answer into an HTTP one. Every route needs a login, and a route that changes something also passes the cross-site check."""
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.core.validation import InvalidInput
from app.dependencies import check_origin, get_db, require_ready_user
from app.models.user import User
from app.schemas.admin import AdminJointProjectRead, JointProjectIn, JointProjectPatch
from app.services import collaborations as service
from app.services.grants import NotAllowed

router = APIRouter(prefix="/admin/joint-projects", tags=["admin: joint projects"], dependencies=[Depends(check_origin), Depends(require_ready_user)])


def _http(error: Exception) -> HTTPException:
    if isinstance(error, NotAllowed):
        return HTTPException(403, {"code": "not_allowed", "message": "Your account may not do this."})
    if isinstance(error, InvalidInput):
        return HTTPException(422, {"code": "invalid_input", "field": error.field, "message": error.message})
    if isinstance(error, service.CodeTaken):
        return HTTPException(409, {"code": "code_taken", "message": "There is a joint project with this code already."})
    if isinstance(error, service.JointProjectNotFound):
        return HTTPException(404, {"code": "joint_project_not_found", "message": "Joint project not found."})
    raise error


_REFUSALS = (NotAllowed, InvalidInput, service.CodeTaken, service.JointProjectNotFound)


@router.get("", response_model=list[AdminJointProjectRead])
def list_joint_projects(user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """The joint projects in the order the page shows them."""
    try:
        return [AdminJointProjectRead.from_model(p) for p in service.list_joint_projects(db, user)]
    except _REFUSALS as error:
        raise _http(error) from None


@router.get("/{project_id}", response_model=AdminJointProjectRead)
def get_joint_project(project_id: int, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    try:
        return AdminJointProjectRead.from_model(service.get_joint_project(db, user, project_id))
    except _REFUSALS as error:
        raise _http(error) from None


@router.post("", response_model=AdminJointProjectRead, status_code=201)
def add_joint_project(body: JointProjectIn, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """Add a joint project, from its record on CORDIS; it goes last. A code that another has is refused (409)."""
    try:
        return AdminJointProjectRead.from_model(service.add_joint_project(db, user, body.model_dump()))
    except _REFUSALS as error:
        raise _http(error) from None


@router.patch("/{project_id}", response_model=AdminJointProjectRead)
def update_joint_project(project_id: int, body: JointProjectPatch, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """Change what is sent."""
    try:
        return AdminJointProjectRead.from_model(service.update_joint_project(db, user, project_id, body.model_dump(exclude_unset=True)))
    except _REFUSALS as error:
        raise _http(error) from None


@router.delete("/{project_id}", status_code=204)
def delete_joint_project(project_id: int, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """Remove a joint project; what was kept of it is in the audit log."""
    try:
        service.delete_joint_project(db, user, project_id)
    except _REFUSALS as error:
        raise _http(error) from None
    return Response(status_code=204)
