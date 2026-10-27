"""What the admin routes (app/internal) send, beyond what the public routes already do."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.grant import Area
from app.models.theme import Project
from app.models.user import User
from app.schemas.person import PersonRead
from app.schemas.user import GrantRead
from app.services.grants import Preset, preset_of


class AffectedRead(BaseModel):
    """A theme whose "Refer to" contacts lose the person when they leave; `contacts_left` are the contacts it keeps (none: its Refer to section disappears)."""

    theme_slug: str
    theme_name: str
    contacts_left: int


class TopicMembershipRead(BaseModel):
    """A research topic group a person is listed under."""

    theme_slug: str
    theme_name: str
    group_title: str


class ResearchAreaRead(BaseModel):
    """A research area of a theme that the user may list people under (`id` is what `topic_group_id` takes when a person is added)."""

    id: int
    title: str
    theme_slug: str
    theme_name: str


class AdminProjectRead(BaseModel):
    """A funded project as the admin shows it: with the theme it belongs to, which the public pages do not need to say."""

    id: int
    theme_slug: str
    theme_name: str
    status: str
    code: str | None
    description: str
    url: str | None

    @classmethod
    def from_model(cls, project: Project) -> "AdminProjectRead":
        return cls(
            id=project.id,
            theme_slug=project.theme.slug,
            theme_name=project.theme.name,
            status=project.status,
            code=project.code,
            description=project.description,
            url=project.url,
        )


class ProjectIn(BaseModel):
    """A new project. `status` is ongoing unless said; `code` and `url` may be left out."""

    model_config = ConfigDict(extra="forbid")

    theme: str
    description: str
    status: str = "ongoing"
    code: str | None = None
    url: str | None = None


class ProjectPatch(BaseModel):
    """What to change in a project: only the fields sent. A `code` or `url` sent as null or empty is removed."""

    model_config = ConfigDict(extra="forbid")

    theme: str | None = None
    status: str | None = None
    description: str | None = None
    code: str | None = None
    url: str | None = None


class FundedBlurbIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str


class FundedBlurbRead(BaseModel):
    """The sentence of a theme page about the theme's funded projects."""

    theme_slug: str
    theme_name: str
    text: str


class DeleteImpactRead(BaseModel):
    """What deleting a person takes with them: the contacts and the topic groups they are in."""

    refer_to: list[AffectedRead]
    topics: list[TopicMembershipRead]


class AdminPersonRead(PersonRead):
    """A person as the admin shows them: what the public page shows, and whether this user may change or delete the entry."""

    can_edit: bool
    can_delete: bool
    # set where the user may change or delete the entry only because they added it: until when (a day after it was made)
    editable_until: datetime | None


class AccountRead(BaseModel):
    """An account as the staff see it in the list of accounts. Never the password or its hash."""

    id: int
    email: str
    name: str
    is_active: bool
    must_change_password: bool
    created_at: datetime
    last_login_at: datetime | None
    # the preset whose grants the account has exactly (none: it has other grants, or none at all)
    preset: Preset | None
    grants: list[GrantRead]

    @classmethod
    def from_model(cls, user: User) -> "AccountRead":
        return cls(
            id=user.id,
            email=user.email,
            name=user.name,
            is_active=user.is_active,
            must_change_password=user.must_change_password,
            created_at=user.created_at,
            last_login_at=user.last_login_at,
            preset=preset_of(user),
            grants=[GrantRead(area=Area(g.area), theme=g.theme.slug if g.theme else None) for g in user.grants],
        )


class AccountCreateIn(BaseModel):
    email: str = Field(max_length=254)
    name: str = Field(max_length=150)
    # none: the account may do nothing
    preset: Preset | None = None


class AccountPatchIn(BaseModel):
    """What may change; only what is sent does (a `preset` sent as null takes every grant away)."""

    name: str | None = Field(default=None, max_length=150)
    preset: Preset | None = None
    is_active: bool | None = None


class TemporaryPasswordRead(BaseModel):
    """The account and the temporary password that was just set. This is the only time the password is shown."""

    account: AccountRead
    temporary_password: str
