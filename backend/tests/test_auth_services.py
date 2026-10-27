"""Passwords, accounts and the lock after wrong tries - the logic under the login (app/services)."""
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import text

from app.core.config import settings
from app.db.session import SessionLocal, engine
from app.models.user import LoginAttempt
from app.services.grants import Preset
from app.services import passwords
from app.services.users import InvalidLogin, LoginLocked, UserError, authenticate, create_user, get_by_email, set_password

GOOD = "correct horse battery staple"


@pytest.fixture(autouse=True)
def no_accounts():
    """Every test starts with no accounts and no failed logins."""
    with engine.begin() as connection:
        connection.execute(text("DELETE FROM login_attempts"))
        connection.execute(text("DELETE FROM users"))
    yield


@pytest.fixture
def db():
    with SessionLocal() as session:
        yield session


# --- passwords --------------------------------------------------------------------------------------------------------------------------------------------------------


def test_a_password_is_stored_as_an_argon2id_hash_never_as_itself():
    hashed = passwords.hash_password(GOOD)
    assert hashed.startswith("$argon2id$")
    assert GOOD not in hashed
    assert passwords.hash_password(GOOD) != hashed  # a new salt every time


def test_the_right_password_verifies_and_a_wrong_one_does_not():
    hashed = passwords.hash_password(GOOD)
    assert passwords.verify_password(GOOD, hashed)[0] is True
    assert passwords.verify_password(GOOD + "x", hashed)[0] is False
    assert passwords.verify_password("", hashed)[0] is False


@pytest.mark.parametrize(
    "password",
    ["short", "a" * 11, "a" * 129, " " + GOOD, GOOD + " ", "aaaaaaaaaaaaaaaa", "ada@example.org"],
)
def test_weak_passwords_are_refused(password):
    with pytest.raises(passwords.WeakPassword):
        passwords.check_policy(password, "ada@example.org")


def test_a_phrase_of_a_few_words_is_a_good_password():
    passwords.check_policy(GOOD, "ada@example.org")
    passwords.check_policy("12-characters", "ada@example.org")


# --- accounts ---------------------------------------------------------------------------------------------------------------------------------------------------------


def test_an_account_is_made_with_a_lower_case_email_and_a_hashed_password(db):
    user = create_user(db, "  Ada@Example.ORG ", " Ada Lovelace ", GOOD, Preset.ADMINISTRATIVE)
    assert (user.email, user.name, user.is_active) == ("ada@example.org", "Ada Lovelace", True)
    assert user.password_hash.startswith("$argon2id$")
    assert get_by_email(db, "ADA@example.org").id == user.id


def test_an_account_made_without_a_preset_has_no_grants(db):
    assert create_user(db, "ed@example.org", "Ed", GOOD).grants == []


@pytest.mark.parametrize(
    ("email", "name", "password"),
    [("not-an-email", "Ada", GOOD), ("ada@example", "Ada", GOOD), ("ada@example.org", "", GOOD), ("ada@example.org", "x" * 151, GOOD), ("ada@example.org", "Ada", "short")],
)
def test_bad_accounts_are_refused(db, email, name, password):
    with pytest.raises(UserError):
        create_user(db, email, name, password)


def test_two_accounts_cannot_share_an_email_whatever_its_case(db):
    create_user(db, "ada@example.org", "Ada", GOOD)
    with pytest.raises(UserError):
        create_user(db, "ADA@example.org", "Another Ada", GOOD)


def test_a_new_password_replaces_the_old_one(db):
    user = create_user(db, "ada@example.org", "Ada", GOOD)
    set_password(db, user, "another very long passphrase")
    with pytest.raises(InvalidLogin):
        authenticate(db, "ada@example.org", GOOD)
    assert authenticate(db, "ada@example.org", "another very long passphrase").id == user.id
    with pytest.raises(UserError):
        set_password(db, user, "short")


# --- logging in -------------------------------------------------------------------------------------------------------------------------------------------------------


def test_the_right_email_and_password_log_in(db):
    created = create_user(db, "ada@example.org", "Ada", GOOD)
    user = authenticate(db, "  ADA@example.org", GOOD)
    assert user.id == created.id
    assert user.last_login_at is not None


@pytest.mark.parametrize("email", ["ada@example.org", "nobody@example.org"])
def test_a_wrong_password_and_an_unknown_email_are_refused_the_same_way(db, email):
    create_user(db, "ada@example.org", "Ada", GOOD)
    with pytest.raises(InvalidLogin):
        authenticate(db, email, "not the password at all")


def test_an_account_that_is_switched_off_cannot_log_in_even_with_the_right_password(db):
    user = create_user(db, "ada@example.org", "Ada", GOOD)
    user.is_active = False
    db.commit()
    with pytest.raises(InvalidLogin):
        authenticate(db, "ada@example.org", GOOD)


def test_after_too_many_wrong_tries_even_the_right_password_is_refused_for_a_while(db):
    create_user(db, "ada@example.org", "Ada", GOOD)
    start = datetime.now(UTC)
    for _ in range(settings.login_max_failures):
        with pytest.raises(InvalidLogin):
            authenticate(db, "ada@example.org", "wrong wrong wrong", now=start)
    with pytest.raises(LoginLocked) as locked:
        authenticate(db, "ada@example.org", GOOD, now=start + timedelta(minutes=1))
    assert 0 < locked.value.retry_after <= settings.login_lock_minutes * 60
    # when the time is over the right password works again, and the count starts afresh
    later = start + timedelta(minutes=settings.login_lock_minutes, seconds=5)
    assert authenticate(db, "ada@example.org", GOOD, now=later).email == "ada@example.org"
    assert db.get(LoginAttempt, "ada@example.org") is None


def test_an_email_nobody_has_is_locked_in_just_the_same(db):
    """So a refusal never tells which emails have an account."""
    start = datetime.now(UTC)
    for _ in range(settings.login_max_failures):
        with pytest.raises(InvalidLogin):
            authenticate(db, "nobody@example.org", "whatever whatever", now=start)
    with pytest.raises(LoginLocked):
        authenticate(db, "nobody@example.org", "whatever whatever", now=start)


def test_the_tries_for_one_email_do_not_lock_another(db):
    create_user(db, "ada@example.org", "Ada", GOOD)
    create_user(db, "grace@example.org", "Grace", GOOD)
    for _ in range(settings.login_max_failures):
        with pytest.raises(InvalidLogin):
            authenticate(db, "ada@example.org", "wrong wrong wrong")
    assert authenticate(db, "grace@example.org", GOOD).name == "Grace"


def test_a_success_forgets_the_wrong_tries_before_it(db):
    create_user(db, "ada@example.org", "Ada", GOOD)
    for _ in range(settings.login_max_failures - 1):
        with pytest.raises(InvalidLogin):
            authenticate(db, "ada@example.org", "wrong wrong wrong")
    authenticate(db, "ada@example.org", GOOD)
    with pytest.raises(InvalidLogin):  # one wrong try now is the first again, not the last
        authenticate(db, "ada@example.org", "wrong wrong wrong")


def test_old_failed_tries_are_forgotten(db):
    old = datetime.now(UTC) - timedelta(days=3)
    with pytest.raises(InvalidLogin):
        authenticate(db, "typo@example.org", "whatever whatever", now=old)
    assert db.get(LoginAttempt, "typo@example.org") is not None
    with pytest.raises(InvalidLogin):
        authenticate(db, "another@example.org", "whatever whatever")
    db.expire_all()
    assert db.get(LoginAttempt, "typo@example.org") is None
