from pydantic import BaseModel

from app.core.media import media_url
from app.models.collaboration import Collaborator, JointProject


class CollaboratorRead(BaseModel):
    name: str
    url: str | None
    logo_url: str | None

    @classmethod
    def from_model(cls, collaborator: Collaborator) -> "CollaboratorRead":
        return cls(name=collaborator.name, url=collaborator.url, logo_url=media_url(collaborator.logo))


class JointProjectRead(BaseModel):
    code: str
    name: str
    funding: str
    years: str
    coordinator: str
    partners: list[str]
    url: str

    @classmethod
    def from_model(cls, project: JointProject) -> "JointProjectRead":
        return cls(
            code=project.code,
            name=project.name,
            funding=project.funding,
            years=project.years,
            coordinator=project.coordinator,
            partners=list(project.partners or []),
            url=project.url,
        )


class CollaborationsRead(BaseModel):
    """Everything the Collaborations page shows: the paragraph under its title, the three logo walls and the joint projects."""

    intro: str
    universities: list[CollaboratorRead]
    institutes: list[CollaboratorRead]
    companies: list[CollaboratorRead]
    joint_projects: list[JointProjectRead]
