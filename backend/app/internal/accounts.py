"""The admin's routes for accounts: for the administrative staff (the grant `accounts`). They only turn a request into a call of app/services/accounts.py and its answer into an HTTP
one. A temporary password is in the answer once and the answer is never kept by a cache."""
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.core.validation import InvalidInput
from app.dependencies import check_origin, get_db, require_ready_user
from app.models.user import User
from app.schemas.admin import AccountCreateIn, AccountPatchIn, AccountRead, TemporaryPasswordRead
from app.services import accounts as service
from app.services.grants import NotAllowed
from app.services.users import EmailTaken, UserError

router = APIRouter(prefix="/admin/accounts", tags=["admin: accounts"], dependencies=[Depends(check_origin), Depends(require_ready_user)])

NO_STORE = {"Cache-Control": "no-store"}


def _http(error: Exception) -> HTTPException:
    if isinstance(error, NotAllowed):
        return HTTPException(403, {"code": "not_allowed", "message": "Your account may not do this."})
    if isinstance(error, service.AccountNotFound):
        return HTTPException(404, {"code": "account_not_found", "message": "Account not found."})
    if isinstance(error, service.AccountError):
        return HTTPException(409, {"code": error.code, "message": error.message})
    if isinstance(error, EmailTaken):
        return HTTPException(409, {"code": "email_taken", "message": str(error)})
    if isinstance(error, InvalidInput):
        return HTTPException(422, {"code": "invalid_input", "field": error.field, "message": error.message})
    if isinstance(error, UserError):
        return HTTPException(422, {"code": "invalid_account", "message": str(error)})
    raise error


_REFUSALS = (NotAllowed, service.AccountNotFound, service.AccountError, EmailTaken, InvalidInput, UserError)


@router.get("", response_model=list[AccountRead])
def list_accounts(response: Response, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """Every account, with its grants and whether it is switched off or still on a temporary password."""
    response.headers.update(NO_STORE)
    try:
        return [AccountRead.from_model(account) for account in service.list_accounts(db, user)]
    except _REFUSALS as error:
        raise _http(error) from None


@router.post("", response_model=TemporaryPasswordRead, status_code=201)
def create_account(data: AccountCreateIn, response: Response, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """Make an account with a temporary password, which is in the answer and nowhere else; the user has to replace it at the first login."""
    response.headers.update(NO_STORE)
    try:
        account, temporary = service.create_account(db, user, data.email, data.name, data.preset)
        return TemporaryPasswordRead(account=AccountRead.from_model(account), temporary_password=temporary)
    except _REFUSALS as error:
        raise _http(error) from None


@router.patch("/{user_id}", response_model=AccountRead)
def update_account(user_id: int, data: AccountPatchIn, response: Response, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """Change the name, the preset (the grants) or whether the account is switched on; only what is sent changes."""
    response.headers.update(NO_STORE)
    changes = data.model_dump(exclude_unset=True)
    try:
        return AccountRead.from_model(service.update_account(db, user, user_id, changes))
    except _REFUSALS as error:
        raise _http(error) from None


@router.post("/{user_id}/reset-password", response_model=TemporaryPasswordRead)
def reset_password(user_id: int, response: Response, user: User = Depends(require_ready_user), db: Session = Depends(get_db)):
    """A new temporary password for the account, in the answer and nowhere else. Its logins end and it has to be changed at the next login."""
    response.headers.update(NO_STORE)
    try:
        account, temporary = service.reset_password(db, user, user_id)
        return TemporaryPasswordRead(account=AccountRead.from_model(account), temporary_password=temporary)
    except _REFUSALS as error:
        raise _http(error) from None
