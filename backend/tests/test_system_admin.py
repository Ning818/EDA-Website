"""The developer's views (app/services/system.py, app/internal/system.py): the activity log and the status of the system. Both need the grant `system` and only read."""
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text

from app.core.config import settings
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.audit import AuditLog
from app.models.link import LinkCheck
from app.models.request import HelpRequest
from app.services import audit
from app.services.grants import Preset
from app.services.users import get_by_email
from tests.admin_helpers import GOOD, browser_for, cleanup_admin_data, make_user
from tests.conftest import seed_everything

AUDIT = "/api/admin/audit"
SYSTEM = "/api/admin/system"


@pytest.fixture(autouse=True)
def clean():
    cleanup_admin_data()
    with engine.begin() as connection:
        connection.execute(text("DELETE FROM link_checks"))
    yield
    cleanup_admin_data()
    with engine.begin() as connection:
        connection.execute(text("DELETE FROM link_checks"))
    seed_everything()


@pytest.fixture
def db():
    with SessionLocal() as session:
        yield session


@pytest.fixture
def dev():
    make_user("dev@example.org", Preset.DEVELOPER)
    return browser_for("dev@example.org")


def write_log(db, rows):
    """Rows of the log: (who, action, entity_type, entity_key, before, after)."""
    for who, action, entity_type, key, before, after in rows:
        db.add(AuditLog(user_email=who, action=action, entity_type=entity_type, entity_key=key, before=before, after=after))
    db.commit()


# --- who may look ---------------------------------------------------------------------------------------------------------------------------------------------------


@pytest.mark.parametrize("path", [AUDIT, SYSTEM])
def test_the_views_need_a_login_and_the_developers_grant(path):
    assert TestClient(app).get(path).status_code == 401
    for email, preset in (("ada@example.org", Preset.ADMINISTRATIVE), ("tom@example.org", Preset.THEME_OWNER), ("pia@example.org", Preset.PROJECTS_OWNER), ("none@example.org", None)):
        make_user(email, preset)
        refused = browser_for(email).get(path)
        assert refused.status_code == 403 and refused.json()["detail"]["code"] == "not_allowed", email


def test_a_user_on_a_temporary_password_sees_nothing(dev):
    with SessionLocal() as db:
        get_by_email(db, "dev@example.org").must_change_password = True
        db.commit()
    for path in (AUDIT, SYSTEM):
        answer = browser_for("dev@example.org").get(path)
        assert answer.status_code == 403 and answer.json()["detail"]["code"] == "password_change_required"


def test_the_views_are_never_kept_by_a_cache(dev):
    assert dev.get(AUDIT).headers["cache-control"] == "no-store"
    assert dev.get(SYSTEM).headers["cache-control"] == "no-store"


# --- the activity log -----------------------------------------------------------------------------------------------------------------------------------------------


def test_the_log_comes_newest_first_with_what_changed(db, dev):
    write_log(
        db,
        [
            ("ada@example.org", "person.add", "person", "grace-hopper", None, {"title": "PhD Student"}),
            ("ada@example.org", "person.update", "person", "grace-hopper", {"title": "PhD Student"}, {"title": "Research Fellow"}),
        ],
    )
    entries = dev.get(AUDIT, params={"user": "ada@"}).json()["entries"]
    assert [e["action"] for e in entries] == ["person.update", "person.add"]
    newest = entries[0]
    assert newest["before"] == {"title": "PhD Student"} and newest["after"] == {"title": "Research Fellow"}
    assert newest["entity_type"] == "person" and newest["entity_key"] == "grace-hopper" and newest["user_email"] == "ada@example.org" and newest["at"]


def test_the_log_is_read_a_page_at_a_time_without_skipping_or_repeating(db, dev):
    write_log(db, [("ada@example.org", "site.contact", "site", str(n), None, {"n": n}) for n in range(7)])
    seen, before = [], None
    for _ in range(10):
        params = {"limit": 3, "user": "ada@"} | ({"before": before} if before else {})
        page = dev.get(AUDIT, params=params).json()
        seen += [e["entity_key"] for e in page["entries"]]
        before = page["next_before"]
        if before is None:
            break
    assert seen == ["6", "5", "4", "3", "2", "1", "0"]


def test_a_row_written_while_reading_does_not_move_the_next_page(db, dev):
    write_log(db, [("ada@example.org", "site.contact", "site", str(n), None, None) for n in range(4)])
    first = dev.get(AUDIT, params={"limit": 2, "user": "ada@"}).json()
    write_log(db, [("ada@example.org", "site.contact", "site", "late", None, None)])
    second = dev.get(AUDIT, params={"limit": 2, "user": "ada@", "before": first["next_before"]}).json()
    assert [e["entity_key"] for e in second["entries"]] == ["1", "0"]


def test_the_last_page_says_there_is_no_next_one(db, dev):
    write_log(db, [("ada@example.org", "site.contact", "site", "a", None, None)])
    page = dev.get(AUDIT, params={"limit": 5, "user": "ada@"}).json()
    assert len(page["entries"]) == 1 and page["next_before"] is None


def test_the_log_is_narrowed_by_the_start_of_the_action_and_by_the_user(db, dev):
    write_log(
        db,
        [
            ("ada@example.org", "person.add", "person", "a", None, None),
            ("ada@example.org", "person.update", "person", "a", None, None),
            ("bea@example.org", "page.intro", "page", "people", None, None),
            ("bea@example.org", "personal.thing", "x", "x", None, None),
        ],
    )
    people = dev.get(AUDIT, params={"action": "person."}).json()["entries"]
    assert sorted(e["action"] for e in people) == ["person.add", "person.update"]  # "personal.thing" does not start with "person."
    only_bea = dev.get(AUDIT, params={"user": "BEA"}).json()["entries"]
    assert sorted(e["action"] for e in only_bea) == ["page.intro", "personal.thing"]  # any case, any part of the email
    both = dev.get(AUDIT, params={"action": "page.", "user": "bea"}).json()["entries"]
    assert [e["action"] for e in both] == ["page.intro"]


def test_what_is_typed_in_a_filter_is_never_a_pattern(db, dev):
    write_log(db, [("ada@example.org", "person.add", "person", "a", None, None), ("odd%name@example.org", "person.update", "person", "b", None, None)])
    assert [e["user_email"] for e in dev.get(AUDIT, params={"user": "%"}).json()["entries"]] == ["odd%name@example.org"]
    assert dev.get(AUDIT, params={"action": "%"}).json()["entries"] == []
    assert dev.get(AUDIT, params={"user": "_"}).json()["entries"] == []


def test_the_log_lists_the_actions_it_holds_for_a_filter_to_offer(db, dev):
    write_log(db, [("ada@example.org", "person.update", "person", "a", None, None), ("ada@example.org", "page.intro", "page", "p", None, None), ("ada@example.org", "person.update", "person", "b", None, None)])
    actions = dev.get(AUDIT).json()["actions"]
    assert {"page.intro", "person.update"} <= set(actions) and actions == sorted(set(actions))  # each once, in order (making the developer's account wrote rows of its own)


@pytest.mark.parametrize("params", [{"limit": 0}, {"limit": 201}, {"limit": "many"}, {"before": 0}, {"before": "x"}, {"action": "x" * 61}, {"user": "x" * 255}])
def test_a_page_asked_for_in_a_wrong_way_is_refused(dev, params):
    assert dev.get(AUDIT, params=params).status_code == 422


def test_the_greatest_page_is_allowed(db, dev):
    write_log(db, [("ada@example.org", "site.contact", "site", str(n), None, None) for n in range(3)])
    assert dev.get(AUDIT, params={"limit": 200}).status_code == 200


def test_the_log_never_shows_a_password_or_its_hash(db):
    make_user("ada@example.org", Preset.ADMINISTRATIVE)
    make_user("dev@example.org", Preset.DEVELOPER)
    ada = browser_for("ada@example.org")
    made = ada.post("/api/admin/accounts", json={"email": "tom@example.org", "name": "Tom", "preset": "theme-owner"})
    assert made.status_code == 201
    ada.post(f"/api/admin/accounts/{made.json()['account']['id']}/reset-password")
    text_of_log = browser_for("dev@example.org").get(AUDIT, params={"limit": 200}).text
    assert "user.create" in text_of_log
    assert made.json()["temporary_password"] not in text_of_log and "$argon2" not in text_of_log and GOOD not in text_of_log


def test_the_changes_of_the_admin_appear_in_the_log_as_they_are_made(db, dev):
    make_user("ada@example.org", Preset.ADMINISTRATIVE)
    ada = browser_for("ada@example.org")
    assert ada.put("/api/admin/site/pages/people", json={"intro": "A new paragraph for the People page."}).status_code == 200
    entries = dev.get(AUDIT, params={"action": "page."}).json()["entries"]
    assert [e["action"] for e in entries] == ["page.intro"] and entries[0]["user_email"] == "ada@example.org"
    assert entries[0]["after"] == {"intro": "A new paragraph for the People page."}


# --- the status -----------------------------------------------------------------------------------------------------------------------------------------------------


def test_the_status_says_how_the_system_is_doing(db, dev):
    status = dev.get(SYSTEM).json()
    assert status["database"]["ok"] is True and status["database"]["migration"] == db.scalar(text("SELECT version_num FROM alembic_version"))
    assert status["server_time"]
    assert status["media"]["files"] >= 0 and status["media"]["bytes"] >= 0
    assert status["accounts"] == {"total": 1, "active": 1, "on_temporary_password": 0}
    assert status["requests_open"] == 0
    content = status["content"]
    assert content["people"] > 0 and content["themes"] == 4 and content["projects"] > 0 and content["collaborators"] > 0 and content["joint_projects"] > 0


def test_the_accounts_are_counted_by_what_they_are(db, dev):
    make_user("a@example.org", Preset.THEME_OWNER)
    make_user("b@example.org", Preset.THEME_OWNER)
    with SessionLocal() as session:
        get_by_email(session, "a@example.org").is_active = False
        get_by_email(session, "b@example.org").must_change_password = True
        session.commit()
    assert dev.get(SYSTEM).json()["accounts"] == {"total": 3, "active": 2, "on_temporary_password": 1}


def test_the_requests_waiting_are_counted(db, dev):
    make_user("tom@example.org", Preset.THEME_OWNER)
    tom = browser_for("tom@example.org")
    for n in range(2):
        tom.post("/api/admin/requests", json={"message": f"Request {n}"})
    assert dev.get(SYSTEM).json()["requests_open"] == 2
    request_id = db.scalar(select(HelpRequest.id).order_by(HelpRequest.id))
    assert dev.post(f"/api/admin/requests/{request_id}/close", json={}).status_code == 200
    assert dev.get(SYSTEM).json()["requests_open"] == 1


def test_a_link_check_that_never_ran_is_stale(dev):
    links = dev.get(SYSTEM).json()["links"]
    assert links["last_check"] is None and links["stale"] is True and links["total"] == 0 and links["stale_after_days"] == settings.link_check_stale_days


def seed_checks(db, now, age):
    """Four links: one good, one broken for the threshold, one broken once, one the site refuses; the last check was `age` ago."""
    at = now - age
    rows = [("ok", 0), ("broken", settings.link_fail_threshold), ("broken", 1), ("blocked", 0)]
    for n, (state, failures) in enumerate(rows):
        db.add(LinkCheck(source_type="collaborator", source_key=str(n), field="url", label=f"L{n}", url=f"https://example.org/{n}", area="site", state=state, failures=failures, last_checked_at=at))
    db.add(LinkCheck(source_type="collaborator", source_key="9", field="url", label="L9", url="https://example.org/9", area="site"))
    db.commit()


def test_the_link_check_is_counted_and_fresh_when_it_ran_lately(db, dev):
    seed_checks(db, datetime.now(UTC), timedelta(hours=5))
    links = dev.get(SYSTEM).json()["links"]
    assert (links["total"], links["ok"], links["broken"], links["blocked"], links["unchecked"]) == (5, 1, 2, 1, 1)
    assert links["reported"] == 1 and links["threshold"] == settings.link_fail_threshold
    assert links["stale"] is False and links["last_check"]


def test_a_link_check_that_has_not_run_for_days_is_stale(db, dev):
    seed_checks(db, datetime.now(UTC), timedelta(days=settings.link_check_stale_days, hours=1))
    assert dev.get(SYSTEM).json()["links"]["stale"] is True
    db.execute(text("UPDATE link_checks SET last_checked_at = now() - interval '1 day'"))
    db.commit()
    assert dev.get(SYSTEM).json()["links"]["stale"] is False


def test_a_database_that_cannot_answer_is_said_so_and_the_rest_still_comes(db, dev, monkeypatch):
    from app.services import system

    class Broken:
        def __init__(self, session):
            self.session = session

        def __getattr__(self, name):
            return getattr(self.session, name)

        def scalar(self, statement, *args, **kwargs):
            if "alembic_version" in str(statement):
                raise RuntimeError("no such table")
            return self.session.scalar(statement, *args, **kwargs)

    user = get_by_email(db, "dev@example.org")
    answer = system.status(Broken(db), user)
    assert answer["database"] == {"ok": False, "migration": None}
    assert answer["accounts"]["total"] >= 1
