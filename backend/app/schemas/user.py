from pydantic import BaseModel, Field

from app.models.grant import Area
from app.models.user import User


class GrantRead(BaseModel):
    """One thing a user may do: an area of the content and, for `theme`, the theme's slug (none: every theme)."""

    area: Area
    theme: str | None


class LoginIn(BaseModel):
    email: str = Field(max_length=254)
    # the length is checked when a password is set, not here: a login with a wrong-length password is just a wrong password
    password: str = Field(max_length=1000)


class SessionRead(BaseModel):
    """How long this login lasts, so that the admin can warn before it ends. `idle_seconds`: it ends after this long without a request (every request starts the time again);
    `max_seconds_left`: whatever the user does, it ends this long from now."""

    idle_seconds: int
    max_seconds_left: int


class UserRead(BaseModel):
    """A logged-in user as the site needs them. Never the password or its hash."""

    id: int
    email: str
    name: str
    grants: list[GrantRead]
    # the password is a temporary one: the user may do nothing but change it (POST /api/auth/change-password)
    must_change_password: bool
    session: SessionRead | None = None

    @classmethod
    def from_model(cls, user: User) -> "UserRead":
        grants = [GrantRead(area=Area(g.area), theme=g.theme.slug if g.theme else None) for g in user.grants]
        return cls(id=user.id, email=user.email, name=user.name, grants=grants, must_change_password=user.must_change_password)
