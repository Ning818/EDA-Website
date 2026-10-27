"""The admin's routes for what is written on a theme: for now the sentence about its funded projects, which the funded-projects owner (the grant `projects`) keeps. They only turn a
request into a call of app/services/projects.py and its answer into an HTTP one."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.validation import InvalidInput
from app.dependencies import check_origin, get_db, require_ready_user
from app.models.user import User
from app.schemas.admin import FundedBlurbIn, FundedBlurbRead
from app.services import projects as service
from app.services.grants import NotAllowed

router = APIRouter(prefix="/admin/themes", tags=["admin: themes"], dependencies=[Depends(check_origin), Depends(require_ready_user)])


@router.put("/{theme_slug}/funded-blurb", response_model=FundedBlurbRead)
def set_funded_blurb(theme_slug: str, body: FundedBlurbIn, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """Write the sentence in the Funded projects card of the theme's Research page about its own projects. It is written by hand and nothing changes it but this."""
    try:
        theme = service.set_funded_blurb(db, user, theme_slug, body.text)
    except NotAllowed:
        raise HTTPException(403, {"code": "not_allowed", "message": "Your account may not do this."}) from None
    except InvalidInput as error:
        raise HTTPException(422, {"code": "invalid_input", "field": error.field, "message": error.message}) from None
    except service.ThemeNotFound:
        raise HTTPException(404, {"code": "theme_not_found", "message": "Theme not found."}) from None
    return FundedBlurbRead(theme_slug=theme.slug, theme_name=theme.name, text=theme.funded_blurb)
