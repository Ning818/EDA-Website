"""The login routes, the cookie, what ends a session, the cross-site check and the grants - through the API, as a browser would use it."""
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import text
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.db.session import SessionLocal, engine
from app.dependencies import current_user, require_grant, require_user
from app.main import app
from app.models.grant import Area
from app.services.grants import Preset
from app.routers import auth
from app.services.users import create_user, set_password

GOOD = "correct horse battery staple"
URL = "/api/auth/login"


@pytest.fixture(autouse=True)
def no_accounts():
    with engine.begin() as connection:
        connection.execute(text("DELETE FROM login_attempts"))
        connection.execute(text("DELETE FROM users"))
    yield


@pytest.fixture
def db():
    with SessionLocal() as session:
        yield session


@pytest.fixture
def browser(database):
    """A browser of its own: its cookies are not shared with any other test."""
    with TestClient(app) as test_client:
        yield test_client


def login(browser, email="ada@example.org", password=GOOD, **kwargs):
    return browser.post(URL, json={"email": email, "password": password}, **kwargs)


def test_a_login_answers_with_the_user_and_sets_the_cookie(browser, db):
    create_user(db, "ada@example.org", "Ada Lovelace", GOOD, Preset.THEME_OWNER)
    answer = login(browser, "ADA@example.org")
    assert answer.status_code == 200
    body = answer.json()
    assert body["email"] == "ada@example.org" and body["name"] == "Ada Lovelace"
    assert body["grants"] == [{"area": "people_add", "theme": None}, {"area": "theme", "theme": None}]
    assert set(body) == {"id", "email", "name", "grants", "must_change_password", "session"} and body["must_change_password"] is False  # never the password or its hash
    assert answer.headers["cache-control"] == "no-store"
    cookie = answer.headers["set-cookie"].lower()
    assert cookie.startswith(f"{settings.session_cookie_name}=")
    assert "httponly" in cookie and "samesite=lax" in cookie and "path=/" in cookie
    assert "secure" not in cookie  # the tests run over plain http (the setting is on where the site has HTTPS)


def test_the_cookie_holds_no_password_and_no_hash(browser, db):
    create_user(db, "ada@example.org", "Ada", GOOD)
    cookie = login(browser).headers["set-cookie"]
    assert GOOD not in cookie and "argon2" not in cookie


def test_who_is_logged_in(browser, db):
    create_user(db, "ada@example.org", "Ada", GOOD)
    assert browser.get("/api/auth/me").status_code == 401
    login(browser)
    me = browser.get("/api/auth/me")
    assert me.status_code == 200 and me.json()["email"] == "ada@example.org"
    assert me.headers["cache-control"] == "no-store"


def test_a_wrong_password_and_an_unknown_email_get_the_same_answer(browser, db):
    create_user(db, "ada@example.org", "Ada", GOOD)
    wrong = login(browser, password="not the password")
    unknown = login(browser, email="nobody@example.org")
    assert (wrong.status_code, wrong.json()) == (unknown.status_code, unknown.json()) == (401, {"detail": "Incorrect email or password"})
    assert "set-cookie" not in wrong.headers and "set-cookie" not in unknown.headers


def test_after_too_many_wrong_tries_the_login_says_wait_and_for_how_long(browser, db):
    create_user(db, "ada@example.org", "Ada", GOOD)
    for _ in range(settings.login_max_failures):
        assert login(browser, password="wrong wrong wrong").status_code == 401
    answer = login(browser)  # even the right password
    assert answer.status_code == 429
    assert 0 < int(answer.headers["retry-after"]) <= settings.login_lock_minutes * 60
    assert "Try again in" in answer.json()["detail"]
    assert browser.get("/api/auth/me").status_code == 401


def test_a_login_needs_both_fields(browser):
    assert browser.post(URL, json={"email": "ada@example.org"}).status_code == 422
    assert browser.post(URL, json={}).status_code == 422
    assert browser.post(URL, json={"email": "x" * 300, "password": "y"}).status_code == 422


def test_logging_out_ends_the_login(browser, db):
    create_user(db, "ada@example.org", "Ada", GOOD)
    login(browser)
    assert browser.post("/api/auth/logout").status_code == 204
    assert browser.get("/api/auth/me").status_code == 401


def test_logging_out_when_nobody_is_logged_in_is_not_an_error(browser):
    assert browser.post("/api/auth/logout").status_code == 204


def test_a_forged_cookie_is_not_a_login(browser, db):
    create_user(db, "ada@example.org", "Ada", GOOD)
    browser.cookies.set(settings.session_cookie_name, "eyJ1aWQiOiAxLCAiaWF0IjogMX0=.abc.def")
    assert browser.get("/api/auth/me").status_code == 401


def test_readers_of_the_public_pages_get_no_cookie(browser):
    for path in ("/api/people", "/api/themes", "/api/collaborations", "/api/health"):
        answer = browser.get(path)
        assert answer.status_code == 200
        assert "set-cookie" not in answer.headers, path


# --- what ends a session ----------------------------------------------------------------------------------------------------------------------------------------------


def test_a_session_ends_after_the_longest_it_may_last(browser, db, monkeypatch):
    create_user(db, "ada@example.org", "Ada", GOOD)
    login(browser)
    assert browser.get("/api/auth/me").status_code == 200
    monkeypatch.setattr(settings, "session_max_hours", 0)
    assert browser.get("/api/auth/me").status_code == 401


def test_a_new_password_ends_the_logins_made_before_it(browser, db):
    user = create_user(db, "ada@example.org", "Ada", GOOD)
    login(browser)
    set_password(db, user, "another very long passphrase")
    assert browser.get("/api/auth/me").status_code == 401
    assert login(browser, password="another very long passphrase").status_code == 200
    assert browser.get("/api/auth/me").status_code == 200


def test_switching_an_account_off_ends_its_login(browser, db):
    user = create_user(db, "ada@example.org", "Ada", GOOD)
    login(browser)
    user.is_active = False
    db.commit()
    assert browser.get("/api/auth/me").status_code == 401


def test_deleting_an_account_ends_its_login(browser, db):
    user = create_user(db, "ada@example.org", "Ada", GOOD)
    login(browser)
    db.delete(user)
    db.commit()
    assert browser.get("/api/auth/me").status_code == 401


# --- a page of another site ------------------------------------------------------------------------------------------------------------------------------------------


def test_a_login_from_a_page_of_another_site_is_refused(browser, db):
    create_user(db, "ada@example.org", "Ada", GOOD)
    answer = login(browser, headers={"Origin": "http://evil.example"})
    assert answer.status_code == 403
    assert "set-cookie" not in answer.headers
    assert browser.post("/api/auth/logout", headers={"Origin": "http://evil.example"}).status_code == 403


@pytest.mark.parametrize("origin", ["http://localhost:5173", "http://testserver"])
def test_a_login_from_the_sites_own_page_is_accepted(browser, db, origin):
    """The front end's address (named in the settings), or the same address the API is reached at (the phone on the Wi-Fi)."""
    create_user(db, "ada@example.org", "Ada", GOOD)
    assert login(browser, headers={"Origin": origin}).status_code == 200


def test_a_login_from_a_sandboxed_page_is_refused(browser):
    assert login(browser, headers={"Origin": "null"}).status_code == 403


# --- the grants --------------------------------------------------------------------------------------------------------------------------------------------------------


@pytest.fixture
def small_app(database):
    """The login routes plus three routes of the kind the admin has: for any user, for those who may add people, for those who may manage accounts."""
    mini = FastAPI()
    mini.add_middleware(SessionMiddleware, secret_key=settings.session_secret, session_cookie=settings.session_cookie_name, same_site="lax")
    mini.include_router(auth.router, prefix="/api")

    @mini.get("/anyone")
    def anyone(user=Depends(require_user)):
        return {"email": user.email}

    @mini.get("/adding", dependencies=[Depends(require_grant(Area.PEOPLE_ADD))])
    def adding():
        return {"ok": True}

    @mini.get("/accounts-only", dependencies=[Depends(require_grant(Area.ACCOUNTS))])
    def accounts_only():
        return {"ok": True}

    @mini.get("/maybe")
    def maybe(user=Depends(current_user)):
        return {"logged_in": user is not None}

    with TestClient(mini) as test_client:
        yield test_client


def test_nobody_logged_in_gets_401_everywhere(small_app):
    for path in ("/anyone", "/adding", "/accounts-only"):
        assert small_app.get(path).status_code == 401, path
    assert small_app.get("/maybe").json() == {"logged_in": False}


def test_a_user_may_do_what_their_grants_say_and_nothing_else(small_app, db):
    create_user(db, "ed@example.org", "Ed", GOOD, Preset.THEME_OWNER)
    login(small_app, "ed@example.org")
    assert small_app.get("/anyone").json() == {"email": "ed@example.org"}
    assert small_app.get("/adding").status_code == 200
    assert small_app.get("/accounts-only").status_code == 403


def test_a_user_without_grants_is_logged_in_and_may_do_nothing(small_app, db):
    create_user(db, "none@example.org", "None", GOOD)
    login(small_app, "none@example.org")
    assert small_app.get("/anyone").status_code == 200
    for path in ("/adding", "/accounts-only"):
        assert small_app.get(path).status_code == 403, path


def test_the_administrative_staff_may_do_both(small_app, db):
    create_user(db, "ada@example.org", "Ada", GOOD, Preset.ADMINISTRATIVE)
    login(small_app)
    for path in ("/anyone", "/adding", "/accounts-only"):
        assert small_app.get(path).status_code == 200, path
