import time

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.dependencies import check_origin, get_db, require_user
from app.models.user import User
from app.schemas.user import LoginIn, UserRead
from app.services.users import InvalidLogin, LoginLocked, UserError, authenticate, change_password

router = APIRouter(prefix="/auth", tags=["auth"])

# nothing here is kept by a cache, in the browser or on the way
NO_STORE = {"Cache-Control": "no-store"}


@router.post("/login", response_model=UserRead, dependencies=[Depends(check_origin)])
def login(data: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    """Log in with an email and a password. The answer for a wrong email and for a wrong password is the same; after a few wrong tries the email is refused for a while."""
    response.headers.update(NO_STORE)
    try:
        user = authenticate(db, data.email, data.password)
    except InvalidLogin:
        raise HTTPException(status_code=401, detail="Incorrect email or password", headers=NO_STORE) from None
    except LoginLocked as locked:
        minutes = max(1, round(locked.retry_after / 60))
        raise HTTPException(
            status_code=429,
            detail=f"Too many failed attempts. Try again in {minutes} minute{'s' if minutes != 1 else ''}.",
            headers={**NO_STORE, "Retry-After": str(locked.retry_after)},
        ) from None
    request.session.clear()  # a fresh session for the login, whatever the cookie held before
    request.session["uid"] = user.id
    request.session["iat"] = time.time()
    return UserRead.from_model(user)


@router.post("/logout", status_code=204, dependencies=[Depends(check_origin)])
def logout(request: Request, response: Response):
    """Log out (also when nobody is logged in)."""
    request.session.clear()
    response.headers.update(NO_STORE)


class PasswordChangeIn(BaseModel):
    current_password: str = Field(max_length=1000)
    new_password: str = Field(max_length=1000)


@router.post("/change-password", response_model=UserRead, dependencies=[Depends(check_origin)])
def change_own_password(data: PasswordChangeIn, request: Request, response: Response, user: User = Depends(require_user), db: Session = Depends(get_db)):
    """The logged-in user's own new password (the way out of a temporary one). The current password has to be right; wrong tries count against the same lock as a login. Every
    other login of the user ends, and this one goes on."""
    response.headers.update(NO_STORE)
    try:
        change_password(db, user, data.current_password, data.new_password)
    except InvalidLogin:
        raise HTTPException(status_code=403, detail={"code": "current_password_wrong", "message": "The current password is not right."}, headers=NO_STORE) from None
    except LoginLocked as locked:
        minutes = max(1, round(locked.retry_after / 60))
        raise HTTPException(
            status_code=429,
            detail={"code": "locked", "message": f"Too many failed attempts. Try again in {minutes} minute{'s' if minutes != 1 else ''}."},
            headers={**NO_STORE, "Retry-After": str(locked.retry_after)},
        ) from None
    except UserError as error:
        raise HTTPException(status_code=422, detail={"code": "invalid_password", "message": str(error)}, headers=NO_STORE) from None
    request.session["iat"] = time.time()  # this login goes on; the ones that began before the change do not
    return UserRead.from_model(user)


@router.get("/me", response_model=UserRead)
def me(response: Response, user: User = Depends(require_user)):
    """Who is logged in; 401 when nobody is."""
    response.headers.update(NO_STORE)
    return UserRead.from_model(user)
