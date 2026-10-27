"""What the admin routes (app/internal) send, beyond what the public routes already do."""
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.grant import Area
from app.models.user import User
from app.schemas.person import PersonRead
from app.schemas.user import GrantRead
from app.services.grants import Preset, preset_of


class AffectedRead(BaseModel):
    """A theme whose "Refer to" contacts lose the person when they leave; `contacts_left` are the contacts it keeps (none: its Refer to section disappears)."""

    theme_slug: str
    theme_name: str
    contacts_left: int


class AdminPersonRead(PersonRead):
    """A person as the admin shows them: what the public page shows, and whether this user may change the entry."""

    can_edit: bool
    # set where the user may change the entry only because they added it: until when (a day after it was made)
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
