from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.collaboration import Collaborator, CollaboratorKind, JointProject
from app.models.page import PageText
from app.schemas.collaboration import CollaborationsRead, CollaboratorRead, JointProjectRead

router = APIRouter(prefix="/collaborations", tags=["collaborations"])


@router.get("", response_model=CollaborationsRead)
def get_collaborations(db: Session = Depends(get_db)):
    """The Collaborations page: the logo walls of universities, institutes and companies (each in the order of its wall) and the joint projects."""
    collaborators = db.scalars(select(Collaborator).order_by(Collaborator.position, Collaborator.id)).all()

    def wall(kind: CollaboratorKind) -> list[CollaboratorRead]:
        return [CollaboratorRead.from_model(c) for c in collaborators if c.kind == kind]

    projects = db.scalars(select(JointProject).order_by(JointProject.position, JointProject.id)).all()
    page = db.get(PageText, "collaborations")
    return CollaborationsRead(
        intro=page.intro if page else "",
        universities=wall(CollaboratorKind.UNIVERSITY),
        institutes=wall(CollaboratorKind.INSTITUTE),
        companies=wall(CollaboratorKind.COMPANY),
        joint_projects=[JointProjectRead.from_model(p) for p in projects],
    )
