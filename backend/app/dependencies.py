import time
from collections.abc import Iterator
from urllib.parse import urlparse

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.grant import Area
from app.models.user import User
from app.services.grants import has_grant


def get_db() -> Iterator[Session]:
    """A database session for one request, closed when the request is done."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def current_user(request: Request, db: Session = Depends(get_db)) -> User | None:
    """The logged-in user, or None. The login is the signed cookie (SessionMiddleware): it holds the user's id and the time of the login. It does not count after
    `session_max_hours`, once the user is switched off, or once their password was changed since the login; then it is cleared."""
    user_id, logged_in_at = request.session.get("uid"), request.session.get("iat")
    if not user_id or not logged_in_at:
        return None
    user = db.get(User, user_id)
    expired = time.time() - logged_in_at > settings.session_max_hours * 3600
    if user is None or not user.is_active or expired or user.password_changed_at.timestamp() > logged_in_at:
        request.session.clear()
        return None
    return user


def require_user(user: User | None = Depends(current_user)) -> User:
    """For a route only a logged-in user may use."""
    if user is None:
        raise HTTPException(status_code=401, detail="Log in first")
    return user


def require_ready_user(user: User = Depends(require_user)) -> User:
    """For a route of the admin: a logged-in user who is not still on a temporary password. Until the password is changed (`POST /api/auth/change-password`) the user may only do that,
    ask who they are (`GET /api/auth/me`) and log out."""
    if user.must_change_password:
        raise HTTPException(status_code=403, detail={"code": "password_change_required", "message": "Change your temporary password first."})
    return user


def require_grant(area: Area):
    """For a route only users with a grant for this area may use: `Depends(require_grant(Area.ACCOUNTS))`. What a user may do is what their grants say (app/services/grants.py)."""

    def check(user: User = Depends(require_ready_user), db: Session = Depends(get_db)) -> User:
        if not has_grant(db, user, area):
            raise HTTPException(status_code=403, detail="Your account may not do this")
        return user

    return check


UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def check_origin(request: Request) -> None:
    """For every route that changes something: a browser always says which page a POST comes from (the Origin header); it must be the site's own page or one the
    API's settings name, else a page of another site is making the visitor's browser send it (cross-site request forgery). A caller that is not a browser
    sends no Origin and is let through: it cannot be made to act with someone's login cookie."""
    if request.method not in UNSAFE_METHODS:
        return
    origin = request.headers.get("origin")
    if origin is None:
        return
    if origin in settings.cors_origins or urlparse(origin).netloc == request.headers.get("host"):
        return
    raise HTTPException(status_code=403, detail="The request came from an unexpected page")
