import time

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.dependencies import check_origin, get_db, require_user
from app.models.user import User
from app.schemas.user import LoginIn, UserRead
from app.services.users import InvalidLogin, LoginLocked, authenticate

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


@router.get("/me", response_model=UserRead)
def me(response: Response, user: User = Depends(require_user)):
    """Who is logged in; 401 when nobody is."""
    response.headers.update(NO_STORE)
    return UserRead.from_model(user)
