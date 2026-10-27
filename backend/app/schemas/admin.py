"""What the admin routes (app/internal) send, beyond what the public routes already do."""
from datetime import datetime

from pydantic import BaseModel

from app.schemas.person import PersonRead


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
