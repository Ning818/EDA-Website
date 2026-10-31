"""The "I can't find what I need" requests (app/services/requests.py, app/internal/requests.py), and what the login tells the admin about how long it lasts."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text

from app.core.config import settings
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.audit import AuditLog
from app.models.request import HelpRequest
from app.services import requests as service
from app.services.grants import Preset
from tests.admin_helpers import GOOD, browser_for, cleanup_admin_data, make_user
from tests.conftest import seed_everything

REQUESTS = "/api/admin/requests"


@pytest.fixture(autouse=True)
def clean():
    cleanup_admin_data()
    yield
    cleanup_admin_data()
    seed_everything()


@pytest.fixture
def db():
    with SessionLocal() as session:
        yield session


def ask(browser, message="I need to change the colours of a theme.", **extra):
    return browser.post(REQUESTS, json={"message": message, **extra})


def audit_actions(db):
    return [row.action for row in db.scalars(select(AuditLog).order_by(AuditLog.id)) if row.action.startswith("request.")]


# --- asking -----------------------------------------------------------------------------------------------------------------------------------------------------------


def test_a_user_asks_and_the_request_is_kept_with_who_asked_and_from_where(db):
    make_user("tom@example.org", Preset.THEME_OWNER)
    answer = ask(browser_for("tom@example.org"), "  I need   to change the colours\nof a theme. ", page="/themes/smart-city")
    assert answer.status_code == 201
    body = answer.json()
    assert body["message"] == "I need to change the colours of a theme." and body["page"] == "/themes/smart-city"
    assert body["status"] == "open" and body["answer"] is None and body["user_email"] == "tom@example.org" and body["user_name"] == "Tom"
    assert answer.headers["cache-control"] == "no-store"
    assert audit_actions(db) == ["request.create"]


def test_an_account_with_no_grants_cannot_ask(db):
    make_user("new@example.org")
    answer = ask(browser_for("new@example.org"))
    assert answer.status_code == 403 and answer.json()["detail"]["code"] == "not_allowed"
    assert db.scalar(select(HelpRequest.id)) is None


@pytest.mark.parametrize("page", ["https://evil.example/x", "//evil.example", "themes", "/a<b>", "/line\u0007bell", "", None])
def test_a_page_that_is_not_a_path_of_the_admin_is_dropped(page):
    make_user("tom@example.org", Preset.THEME_OWNER)
    answer = ask(browser_for("tom@example.org"), page=page)
    assert answer.status_code == 201 and answer.json()["page"] is None


def test_a_long_page_is_cut():
    make_user("tom@example.org", Preset.THEME_OWNER)
    assert len(ask(browser_for("tom@example.org"), page="/" + "a" * 400).json()["page"]) == 200


@pytest.mark.parametrize("message, code_field", [("", "message"), ("   \n ", "message"), ("a <b>bold</b> request", "message"), ("x" * (service.MESSAGE_MAX + 1), "message")])
def test_an_empty_or_unsafe_or_long_request_is_refused(message, code_field):
    make_user("tom@example.org", Preset.THEME_OWNER)
    answer = ask(browser_for("tom@example.org"), message)
    assert answer.status_code == 422 and answer.json()["detail"]["field"] == code_field


def test_a_request_of_the_greatest_length_is_accepted():
    make_user("tom@example.org", Preset.THEME_OWNER)
    assert ask(browser_for("tom@example.org"), "x" * service.MESSAGE_MAX).status_code == 201


def test_a_user_cannot_have_more_than_five_requests_waiting():
    make_user("tom@example.org", Preset.THEME_OWNER)
    make_user("pia@example.org", Preset.PROJECTS_OWNER)
    tom = browser_for("tom@example.org")
    for n in range(service.OPEN_MAX):
        assert ask(tom, f"Request {n}").status_code == 201
    refused = ask(tom, "One more")
    assert refused.status_code == 409 and refused.json()["detail"]["code"] == "too_many_open"
    assert ask(browser_for("pia@example.org")).status_code == 201  # the limit is the user's own


def test_asking_needs_a_login_and_the_same_site(db):
    assert TestClient(app).post(REQUESTS, json={"message": "Hello"}).status_code == 401
    make_user("tom@example.org", Preset.THEME_OWNER)
    answer = browser_for("tom@example.org").post(REQUESTS, json={"message": "Hello"}, headers={"Origin": "https://evil.example"})
    assert answer.status_code == 403
    assert db.scalar(select(HelpRequest.id)) is None


def test_a_user_on_a_temporary_password_cannot_ask():
    make_user("tom@example.org", Preset.THEME_OWNER)
    with SessionLocal() as db:
        from app.services.users import get_by_email

        get_by_email(db, "tom@example.org").must_change_password = True
        db.commit()
    answer = ask(browser_for("tom@example.org"))
    assert answer.status_code == 403 and answer.json()["detail"]["code"] == "password_change_required"


def test_unknown_fields_are_refused():
    make_user("tom@example.org", Preset.THEME_OWNER)
    assert browser_for("tom@example.org").post(REQUESTS, json={"message": "Hello", "status": "done"}).status_code == 422


# --- reading ----------------------------------------------------------------------------------------------------------------------------------------------------------


def test_a_user_sees_their_own_requests_and_nobody_elses():
    make_user("tom@example.org", Preset.THEME_OWNER)
    make_user("pia@example.org", Preset.PROJECTS_OWNER)
    tom, pia = browser_for("tom@example.org"), browser_for("pia@example.org")
    ask(tom, "Tom first")
    ask(tom, "Tom second")
    ask(pia, "Pia only")
    mine = tom.get(f"{REQUESTS}/mine").json()
    assert [r["message"] for r in mine["requests"]] == ["Tom second", "Tom first"] and mine["open"] == 2
    assert [r["message"] for r in pia.get(f"{REQUESTS}/mine").json()["requests"]] == ["Pia only"]
    assert tom.get(f"{REQUESTS}/mine").headers["cache-control"] == "no-store"


def test_only_the_developer_sees_every_request_the_waiting_ones_first():
    make_user("ada@example.org", Preset.DEVELOPER)
    make_user("tom@example.org", Preset.THEME_OWNER)
    tom, ada = browser_for("tom@example.org"), browser_for("ada@example.org")
    first = ask(tom, "First").json()["id"]
    second = ask(tom, "Second").json()["id"]
    third = ask(tom, "Third").json()["id"]
    assert ada.post(f"{REQUESTS}/{first}/close", json={"answer": "Done by hand."}).status_code == 200
    everything = ada.get(REQUESTS).json()
    assert [r["id"] for r in everything["requests"]] == [second, third, first] and everything["open"] == 2
    refused = tom.get(REQUESTS)
    assert refused.status_code == 403 and refused.json()["detail"]["code"] == "not_allowed"
    assert TestClient(app).get(REQUESTS).status_code == 401


def test_the_administrative_staff_may_ask_but_neither_read_nor_answer_the_requests():
    make_user("sam@example.org", Preset.ADMINISTRATIVE)
    sam = browser_for("sam@example.org")
    request_id = ask(sam).json()["id"]  # they ask like everyone else, and read their own
    assert sam.get(f"{REQUESTS}/mine").json()["open"] == 1
    assert sam.get(REQUESTS).status_code == 403
    assert sam.post(f"{REQUESTS}/{request_id}/close", json={"answer": "Done."}).status_code == 403


# --- answering --------------------------------------------------------------------------------------------------------------------------------------------------------


def test_the_developer_closes_a_request_with_an_answer_the_asker_can_read(db):
    make_user("ada@example.org", Preset.DEVELOPER)
    make_user("tom@example.org", Preset.THEME_OWNER)
    tom, ada = browser_for("tom@example.org"), browser_for("ada@example.org")
    request_id = ask(tom).json()["id"]
    closed = ada.post(f"{REQUESTS}/{request_id}/close", json={"answer": "  The colours are kept in the code;  I have told the developer. "})
    assert closed.status_code == 200
    body = closed.json()
    assert body["status"] == "done" and body["answer"] == "The colours are kept in the code; I have told the developer." and body["handled_by"] == "ada@example.org" and body["handled_at"]
    mine = tom.get(f"{REQUESTS}/mine").json()
    assert mine["open"] == 0 and mine["requests"][0]["answer"] == body["answer"] and mine["requests"][0]["status"] == "done"
    assert audit_actions(db) == ["request.create", "request.close"]


def test_a_request_can_be_closed_without_an_answer():
    make_user("ada@example.org", Preset.DEVELOPER)
    make_user("tom@example.org", Preset.THEME_OWNER)
    request_id = ask(browser_for("tom@example.org")).json()["id"]
    closed = browser_for("ada@example.org").post(f"{REQUESTS}/{request_id}/close", json={})
    assert closed.status_code == 200 and closed.json()["answer"] is None and closed.json()["status"] == "done"


def test_a_request_cannot_be_answered_twice():
    make_user("ada@example.org", Preset.DEVELOPER)
    make_user("tom@example.org", Preset.THEME_OWNER)
    ada = browser_for("ada@example.org")
    request_id = ask(browser_for("tom@example.org")).json()["id"]
    assert ada.post(f"{REQUESTS}/{request_id}/close", json={"answer": "Done."}).status_code == 200
    again = ada.post(f"{REQUESTS}/{request_id}/close", json={"answer": "Changed my mind."})
    assert again.status_code == 409 and again.json()["detail"]["code"] == "already_done"
    assert browser_for("tom@example.org").get(f"{REQUESTS}/mine").json()["requests"][0]["answer"] == "Done."


def test_an_answer_that_is_too_long_or_unsafe_is_refused_and_the_request_stays_open():
    make_user("ada@example.org", Preset.DEVELOPER)
    make_user("tom@example.org", Preset.THEME_OWNER)
    ada = browser_for("ada@example.org")
    request_id = ask(browser_for("tom@example.org")).json()["id"]
    assert ada.post(f"{REQUESTS}/{request_id}/close", json={"answer": "x" * (service.ANSWER_MAX + 1)}).status_code == 422
    assert ada.post(f"{REQUESTS}/{request_id}/close", json={"answer": "<script>"}).status_code == 422
    assert ada.get(REQUESTS).json()["open"] == 1


def test_only_the_developer_can_close_and_an_unknown_request_is_not_found():
    make_user("ada@example.org", Preset.DEVELOPER)
    make_user("tom@example.org", Preset.THEME_OWNER)
    tom = browser_for("tom@example.org")
    request_id = ask(tom).json()["id"]
    refused = tom.post(f"{REQUESTS}/{request_id}/close", json={})
    assert refused.status_code == 403 and refused.json()["detail"]["code"] == "not_allowed"
    assert TestClient(app).post(f"{REQUESTS}/{request_id}/close", json={}).status_code == 401
    missing = browser_for("ada@example.org").post(f"{REQUESTS}/99999/close", json={})
    assert missing.status_code == 404 and missing.json()["detail"]["code"] == "request_not_found"
    assert tom.get(f"{REQUESTS}/mine").json()["open"] == 1


def test_a_request_stays_readable_when_the_account_is_gone(db):
    make_user("tom@example.org", Preset.THEME_OWNER)
    ask(browser_for("tom@example.org"))
    with engine.begin() as connection:
        connection.execute(text("DELETE FROM users"))
    row = db.scalar(select(HelpRequest))
    assert row.user_id is None and row.user_email == "tom@example.org" and row.message


# --- how long the login lasts -------------------------------------------------------------------------------------------------------------------------------------


def test_the_login_says_how_long_it_lasts():
    make_user("tom@example.org", Preset.THEME_OWNER)
    browser = TestClient(app)
    logged_in = browser.post("/api/auth/login", json={"email": "tom@example.org", "password": GOOD}).json()["session"]
    assert logged_in["idle_seconds"] == settings.session_idle_minutes * 60
    assert settings.session_max_hours * 3600 - 10 <= logged_in["max_seconds_left"] <= settings.session_max_hours * 3600
    later = browser.get("/api/auth/me").json()["session"]
    assert later["idle_seconds"] == logged_in["idle_seconds"] and later["max_seconds_left"] <= logged_in["max_seconds_left"]


def test_the_time_left_runs_down_with_the_age_of_the_login(db):
    import time
    from types import SimpleNamespace

    from app.routers import auth
    from app.services.users import get_by_email

    make_user("tom@example.org", Preset.THEME_OWNER)
    user = get_by_email(db, "tom@example.org")
    cases = {0: settings.session_max_hours * 3600, 3 * 3600: settings.session_max_hours * 3600 - 3 * 3600, 20 * 3600: 0}  # a login older than the limit has nothing left
    for age, left in cases.items():
        session = auth._read(user, SimpleNamespace(session={"iat": time.time() - age})).session
        assert left - 2 <= session.max_seconds_left <= left


def test_changing_the_password_gives_the_new_time():
    make_user("tom@example.org", Preset.THEME_OWNER)
    browser = browser_for("tom@example.org")
    answer = browser.post("/api/auth/change-password", json={"current_password": GOOD, "new_password": "another long passphrase 2026"})
    assert answer.status_code == 200 and answer.json()["session"]["max_seconds_left"] > settings.session_max_hours * 3600 - 10
