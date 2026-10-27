"""Accounts, as the administrative staff keep them (the grant `accounts`): make one, change a name or the grants, switch one off, give one a new temporary password. The admin's routes
(app/internal/accounts.py) call this; the developer's command line (app/manage.py) goes round it on purpose, as the way back in if the staff are locked out.

Rules kept here:
- A new account, and one given a new password, gets a temporary password that is shown once and has to be replaced at the first login (until then the user may do nothing else).
- A user may not switch off or change the grants of their own account, nor reset their own password here (they change it themselves).
- At least one active account with the grant `accounts` is always left.
- Every change writes an audit row; never a password.
"""
import secrets

from sqlalchemy import delete, distinct, func, select
from sqlalchemy.orm import Session

from app.core.validation import clean_text
from app.models.grant import Area, UserGrant
from app.models.user import LoginAttempt, User
from app.services import audit
from app.services.grants import PRESET_AREAS, Preset, grants_snapshot, has_grant, preset_of, replace_with_preset, require
from app.services.passwords import WeakPassword, check_policy
from app.services.users import create_user, set_password

# a temporary password is read out or written down once: no letters that look like digits or like each other
_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"


class AccountError(Exception):
    """What was asked about an account is refused; `code` says why and `message` can be shown."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


class AccountNotFound(LookupError):
    pass


def new_temporary_password() -> str:
    """Three groups of four, such as `k7mq-x3ah-p9tw`; it has to pass the password rules like any other."""
    while True:
        password = "-".join("".join(secrets.choice(_ALPHABET) for _ in range(4)) for _ in range(3))
        try:
            check_policy(password)
        except WeakPassword:
            continue
        return password


def _other_managers(db: Session, user: User) -> int:
    """The active accounts, other than this one, that may manage accounts."""
    return db.scalar(
        select(func.count(distinct(User.id)))
        .join(UserGrant, UserGrant.user_id == User.id)
        .where(UserGrant.area == Area.ACCOUNTS.value, User.is_active.is_(True), User.id != user.id)
    ) or 0


def list_accounts(db: Session, actor: User) -> list[User]:
    require(db, actor, Area.ACCOUNTS)
    return list(db.scalars(select(User).order_by(User.id)))


def get_account(db: Session, actor: User, user_id: int) -> User:
    require(db, actor, Area.ACCOUNTS)
    user = db.get(User, user_id)
    if user is None:
        raise AccountNotFound(user_id)
    return user


def create_account(db: Session, actor: User, email: str, name: str, preset: Preset | None) -> tuple[User, str]:
    """Make an account with a temporary password, which is returned (once: only its hash is kept)."""
    require(db, actor, Area.ACCOUNTS)
    temporary = new_temporary_password()
    user = create_user(db, email, name, temporary, preset, actor, must_change_password=True)
    return user, temporary


def _state(user: User) -> dict:
    preset = preset_of(user)
    return {"name": user.name, "is_active": user.is_active, "preset": preset.value if preset else None, "grants": grants_snapshot(user)}


def update_account(db: Session, actor: User, user_id: int, changes: dict) -> User:
    """Change what is in `changes`: `name`, `preset` (a Preset, or None for no grants) and `is_active`."""
    user = get_account(db, actor, user_id)
    before = _state(user)
    mine = user.id == actor.id
    is_manager = has_grant(db, user, Area.ACCOUNTS)

    if "name" in changes:
        user.name = clean_text(changes["name"], "name", label="The name", max_length=150, required=True)
    if "preset" in changes:
        preset = Preset(changes["preset"]) if changes["preset"] is not None else None
        if preset != preset_of(user):
            if mine:
                raise AccountError("not_on_yourself", "You cannot change the grants of your own account.")
            keeps_managing = preset is not None and Area.ACCOUNTS in PRESET_AREAS[preset]
            if is_manager and user.is_active and not keeps_managing and _other_managers(db, user) == 0:
                raise AccountError("last_account_manager", "At least one active account must be able to manage accounts.")
            replace_with_preset(db, user, preset)
    if changes.get("is_active") is False and user.is_active:
        if mine:
            raise AccountError("not_on_yourself", "You cannot switch off your own account.")
        if is_manager and _other_managers(db, user) == 0:
            raise AccountError("last_account_manager", "At least one active account must be able to manage accounts.")
        user.is_active = False
    elif changes.get("is_active") is True:
        user.is_active = True

    audit.record(db, actor, "user.update", "user", user.email, before=before, after=_state(user))
    db.commit()
    return user


def reset_password(db: Session, actor: User, user_id: int) -> tuple[User, str]:
    """A new temporary password for the account, returned once. The account's logins end, a lock after wrong tries is lifted, and the user must change the password at the next login."""
    user = get_account(db, actor, user_id)
    if user.id == actor.id:
        raise AccountError("not_on_yourself", "Change your own password with 'change password'.")
    temporary = new_temporary_password()
    db.execute(delete(LoginAttempt).where(LoginAttempt.email == user.email))
    set_password(db, user, temporary, must_change=True, actor=actor, action="user.reset_password")
    return user, temporary
