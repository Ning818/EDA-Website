from pydantic import BaseModel, Field

from app.models.user import User


class LoginIn(BaseModel):
    email: str = Field(max_length=254)
    # the length is checked when a password is set, not here: a login with a wrong-length password is just a wrong password
    password: str = Field(max_length=1000)


class UserRead(BaseModel):
    """A logged-in user as the site needs them. Never the password or its hash."""

    id: int
    email: str
    name: str
    role: str

    @classmethod
    def from_model(cls, user: User) -> "UserRead":
        return cls(id=user.id, email=user.email, name=user.name, role=user.role)
