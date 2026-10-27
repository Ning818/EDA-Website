"""Accounts and logins: the one place that makes users, sets their passwords and checks a login. The routes, the command line (app/manage.py) and, later, the admin all use it."""
import re
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import LoginAttempt, User
from app.services import audit
from app.services.grants import Preset, apply_preset
from app.services.passwords import DUMMY_HASH, WeakPassword, check_policy, hash_password, verify_password

_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class UserError(ValueError):
    """What was asked about an account cannot be done; the message can be shown."""


class EmailTaken(UserError):
    """There is an account with that email already."""


class InvalidLogin(Exception):
    """The email or the password is wrong, or the account is switched off: all the same to whoever asked."""


class LoginLocked(Exception):
    """Too many wrong passwords for this email lately; `retry_after` is the seconds until it may be tried again."""

    def __init__(self, retry_after: int):
        super().__init__("too many failed logins")
        self.retry_after = retry_after


def normalize_email(email: str) -> str:
    return email.strip().lower()


def get_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == normalize_email(email)))


def create_user(db: Session, email: str, name: str, password: str, preset: Preset | None = None, actor: User | None = None, must_change_password: bool = False) -> User:
    """Make an account. With a `preset` the user gets its grants; without one they can log in and may do nothing (the least a user can have). `must_change_password`: the password is
    a temporary one that has to be replaced at the first login."""
    email = normalize_email(email)
    if len(email) > 254 or not _EMAIL.match(email):
        raise UserError("That is not an email address.")
    name = name.strip()
    if not name or len(name) > 150:
        raise UserError("The name must be 1 to 150 characters.")
    if get_by_email(db, email):
        raise EmailTaken("There is an account with that email already.")
    try:
        check_policy(password, email)
    except WeakPassword as error:
        raise UserError(str(error)) from error
    user = User(email=email, name=name, password_hash=hash_password(password), must_change_password=must_change_password)
    db.add(user)
    db.flush()
    if preset is not None:
        apply_preset(db, user, Preset(preset), actor)
    audit.record(db, actor, "user.create", "user", email, after={"name": name, "preset": Preset(preset).value if preset is not None else None})
    db.commit()
    return user


def set_password(db: Session, user: User, password: str, *, must_change: bool = False, actor: User | None = None, action: str | None = None) -> None:
    """A new password; every login the user has now is ended (a session older than the change is not accepted). `must_change`: it is a temporary one that has to be replaced at
    the next login. With an `action` the change is written to the audit log, as `actor`'s (never the password itself)."""
    try:
        check_policy(password, user.email)
    except WeakPassword as error:
        raise UserError(str(error)) from error
    user.password_hash = hash_password(password)
    user.password_changed_at = datetime.now(UTC)
    user.must_change_password = must_change
    if action:
        audit.record(db, actor, action, "user", user.email)
    db.commit()


def change_password(db: Session, user: User, current: str, new: str) -> None:
    """The user's own change of password. The current password has to be right - checked the way a login is, so wrong tries count and lock it too - and the new one a different
    one. Every other login of the user ends."""
    authenticate(db, user.email, current, touch_last_login=False)
    if new == current:
        raise UserError("The new password must be different from the current one.")
    set_password(db, user, new, actor=user, action="user.change_password")


def authenticate(db: Session, email: str, password: str, now: datetime | None = None, touch_last_login: bool = True) -> User:
    """The user for this email and password. Raises InvalidLogin for any wrong or switched-off account (with the same words and about the same time whether the email has an
    account or not), and LoginLocked once there have been `login_max_failures` wrong tries for the email, until `login_lock_minutes` have passed."""
    now = now or datetime.now(UTC)
    key = normalize_email(email)[:254]
    attempt = db.get(LoginAttempt, key)
    if attempt and attempt.locked_until and attempt.locked_until > now:
        raise LoginLocked(int((attempt.locked_until - now).total_seconds()) + 1)

    user = get_by_email(db, key)
    valid, new_hash = verify_password(password, user.password_hash if user else DUMMY_HASH)
    if user and valid and user.is_active:
        if attempt:
            db.delete(attempt)
        if new_hash:  # saved with the library's current settings
            user.password_hash = new_hash
        if touch_last_login:
            user.last_login_at = now
        db.commit()
        return user

    if attempt is None:
        attempt = LoginAttempt(email=key, failures=0)
        db.add(attempt)
    attempt.failures += 1
    attempt.updated_at = now
    if attempt.failures >= settings.login_max_failures:
        attempt.locked_until = now + timedelta(minutes=settings.login_lock_minutes)
    # tries that stopped long ago are forgotten, so the table does not fill up with every email anyone ever typed
    db.execute(delete(LoginAttempt).where(LoginAttempt.updated_at < now - timedelta(days=1), (LoginAttempt.locked_until.is_(None)) | (LoginAttempt.locked_until < now)))
    db.commit()
    raise InvalidLogin
