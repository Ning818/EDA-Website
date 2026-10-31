"""The check of the links in the content (app/services/links.py, app/internal/links.py, `python -m app.manage check-links`): which addresses are found, what counts as broken, when a link is
reported, who sees it, and that the checker never goes to a private address. The network is never asked: the checks are given a fetcher of their own, and the real one is tried against a server
on this computer."""
import http.server
import threading
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text

from app import manage
from app.core.config import settings
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.collaboration import Collaborator
from app.models.grant import Area
from app.models.link import LinkCheck
from app.models.person import Person
from app.models.theme import Theme
from app.services import links
from app.services.grants import Preset, grant
from app.services.users import get_by_email
from tests.admin_helpers import browser_for, cleanup_admin_data, make_user
from tests.conftest import seed_everything

PROBLEMS = "/api/admin/links/problems"


def wipe():
    with engine.begin() as connection:
        connection.execute(text("DELETE FROM link_checks"))


@pytest.fixture(autouse=True)
def clean():
    cleanup_admin_data()
    wipe()
    yield
    cleanup_admin_data()
    wipe()
    seed_everything()


@pytest.fixture
def db():
    with SessionLocal() as session:
        yield session


@pytest.fixture
def visitor(database):
    return TestClient(app)


def ok(url):
    return links.Outcome(links.OK, None)


def broken_for(*urls, detail="404 Not Found"):
    return lambda url: links.Outcome(links.BROKEN, detail) if url in urls else links.Outcome(links.OK, None)


def run_checks(db, fetcher, times=1, start=None):
    start = start or datetime(2026, 10, 1, 4, 0, tzinfo=UTC)
    summary = None
    for n in range(times):
        summary = links.check_all(db, fetcher=fetcher, now=start + timedelta(days=n))
    return summary


def a_url(db, source_type, area=None):
    row = db.scalars(select(LinkCheck).where(LinkCheck.source_type == source_type).order_by(LinkCheck.id)).first()
    return row


# --- what is found ------------------------------------------------------------------------------------------------------------------------------------------------


def test_every_address_of_the_content_gets_a_row_with_the_area_of_whoever_keeps_it(db):
    added, removed = links.sync_targets(db)
    db.commit()
    assert removed == 0 and added > 100
    kinds = {}
    for row in db.scalars(select(LinkCheck)):
        kinds.setdefault(row.source_type, set()).add(row.area)
    assert kinds == {"person": {"people"}, "collaborator": {"site"}, "joint_project": {"site"}, "project": {"projects"}, "highlight": {"theme"}}
    person = db.scalars(select(LinkCheck).where(LinkCheck.source_type == "person")).first()
    assert person.label.startswith(db.scalar(select(Person.name).where(Person.slug == person.source_key)))
    card = db.scalars(select(LinkCheck).where(LinkCheck.source_type == "highlight")).first()
    assert card.theme_id is not None and card.source_key.split(":")[1] in ("paper", "project")


def test_the_same_address_in_several_places_is_asked_for_once(db):
    asked = []

    def fetcher(url):
        asked.append(url)
        return links.Outcome(links.OK, None)

    summary = links.check_all(db, fetcher=fetcher)
    assert len(asked) == len(set(asked)) == summary.addresses <= summary.links


# --- when a link is reported -----------------------------------------------------------------------------------------------------------------------------------------


def test_a_link_is_reported_only_after_several_failed_checks_in_a_row(db):
    make_user("ada@example.org", Preset.ADMINISTRATIVE)
    ada = get_by_email(db, "ada@example.org")
    links.sync_targets(db)
    bad = a_url(db, "person").url
    for done in (1, 2):
        run_checks(db, broken_for(bad), times=1, start=datetime(2026, 10, done, 4, tzinfo=UTC))
        assert links.problems_for(db, ada) == [], done  # failed once or twice: not blamed yet
    run_checks(db, broken_for(bad), times=1, start=datetime(2026, 10, 3, 4, tzinfo=UTC))
    reported = links.problems_for(db, ada)
    assert reported and all(r.url == bad and r.failures == 3 for r in reported)
    assert reported[0].first_failed_at == datetime(2026, 10, 1, 4, tzinfo=UTC)


def test_one_good_answer_clears_the_count(db):
    links.sync_targets(db)
    bad = a_url(db, "person").url
    run_checks(db, broken_for(bad), times=2)
    run_checks(db, ok, times=1, start=datetime(2026, 10, 5, tzinfo=UTC))
    run_checks(db, broken_for(bad), times=2, start=datetime(2026, 10, 6, tzinfo=UTC))
    rows = list(db.scalars(select(LinkCheck).where(LinkCheck.url == bad)))
    assert rows and all(r.failures == 2 for r in rows)  # two more, not four: the good answer started the count again


def test_a_site_that_refuses_programs_is_never_counted_as_broken(db):
    links.sync_targets(db)
    refusing = a_url(db, "person").url
    blocked = lambda url: links.Outcome(links.BLOCKED, "403 Forbidden") if url == refusing else links.Outcome(links.OK, None)  # noqa: E731
    run_checks(db, blocked, times=5)
    rows = list(db.scalars(select(LinkCheck).where(LinkCheck.url == refusing)))
    assert rows and all(r.state == links.BLOCKED and r.failures == 0 for r in rows)
    make_user("ada@example.org", Preset.ADMINISTRATIVE)
    assert links.problems_for(db, get_by_email(db, "ada@example.org")) == []


def test_the_summary_says_what_was_found_and_how_many_are_reported(db):
    links.sync_targets(db)
    bad = a_url(db, "collaborator").url
    summary = run_checks(db, broken_for(bad), times=3)
    assert summary.broken >= 1 and summary.reported == summary.broken and summary.ok + summary.broken + summary.blocked == summary.links
    assert summary.added == 0 and summary.removed == 0


# --- the content changes ------------------------------------------------------------------------------------------------------------------------------------------------


def test_a_link_that_is_changed_is_not_reported_any_more_and_starts_again(db):
    make_user("ada@example.org", Preset.ADMINISTRATIVE)
    ada = get_by_email(db, "ada@example.org")
    links.sync_targets(db)
    row = a_url(db, "collaborator")
    run_checks(db, broken_for(row.url), times=3)
    assert [r.url for r in links.problems_for(db, ada)].count(row.url) >= 1
    collaborator = db.get(Collaborator, int(row.source_key))
    collaborator.url = "https://www.example.org/a-new-address"
    db.commit()
    assert row.url not in [r.url for r in links.problems_for(db, ada)]  # at once, before any new check
    links.sync_targets(db)
    db.commit()
    db.refresh(row)
    assert row.url == "https://www.example.org/a-new-address" and row.state == links.UNCHECKED and row.failures == 0


def test_the_rows_of_content_that_is_gone_are_removed(db):
    links.sync_targets(db)
    row = a_url(db, "collaborator")
    key = row.source_key
    db.delete(db.get(Collaborator, int(key)))
    db.commit()
    _, removed = links.sync_targets(db)
    db.commit()
    assert removed >= 1 and db.scalar(select(LinkCheck.id).where(LinkCheck.source_type == "collaborator", LinkCheck.source_key == key)) is None


# --- who sees what ------------------------------------------------------------------------------------------------------------------------------------------------------


def report_one_of_each(db):
    """Make one broken, reported link of every kind, and say which they are."""
    links.sync_targets(db)
    chosen = {kind: a_url(db, kind) for kind in ("person", "collaborator", "joint_project", "project", "highlight")}
    run_checks(db, broken_for(*[row.url for row in chosen.values()]), times=3)
    return chosen


def kinds_seen(db, email):
    return {row.source_type for row in links.problems_for(db, get_by_email(db, email))}


def test_each_user_sees_the_broken_links_of_the_content_they_keep(db):
    make_user("ada@example.org", Preset.ADMINISTRATIVE)
    make_user("pia@example.org", Preset.PROJECTS_OWNER)
    make_user("tom@example.org", Preset.THEME_OWNER)
    make_user("none@example.org")
    report_one_of_each(db)
    assert kinds_seen(db, "ada@example.org") == {"person", "collaborator", "joint_project"}
    assert kinds_seen(db, "pia@example.org") == {"project"}
    assert kinds_seen(db, "tom@example.org") == {"highlight"}
    assert kinds_seen(db, "none@example.org") == set()


def test_a_user_with_the_grant_for_one_theme_sees_the_cards_of_that_theme_only(db):
    chosen = report_one_of_each(db)
    card_theme = chosen["highlight"].theme_id
    # another theme whose card does not share the broken address (the same address on two cards would be broken on both)
    sharing = set(db.scalars(select(LinkCheck.theme_id).where(LinkCheck.source_type == "highlight", LinkCheck.url == chosen["highlight"].url)))
    other = db.scalar(select(Theme.id).where(Theme.id.notin_(sharing)).order_by(Theme.id))
    make_user("one@example.org")
    make_user("two@example.org")
    grant(db, get_by_email(db, "one@example.org"), Area.THEME, card_theme)
    grant(db, get_by_email(db, "two@example.org"), Area.THEME, other)
    db.commit()
    assert kinds_seen(db, "one@example.org") == {"highlight"}
    assert kinds_seen(db, "two@example.org") == set()


def test_the_list_of_problems_over_http(db, visitor):
    assert visitor.get(PROBLEMS).status_code == 401
    make_user("ada@example.org", Preset.ADMINISTRATIVE)
    ada = browser_for("ada@example.org")
    empty = ada.get(PROBLEMS).json()
    assert empty == {"problems": [], "last_check": None, "threshold": settings.link_fail_threshold}
    chosen = report_one_of_each(db)
    answer = ada.get(PROBLEMS).json()
    assert answer["last_check"] is not None and answer["threshold"] == 3
    person = next(p for p in answer["problems"] if p["source_type"] == "person")
    assert person["url"] == chosen["person"].url and person["failures"] == 3 and person["detail"] == "404 Not Found" and person["label"]
    assert {p["source_type"] for p in answer["problems"]} == {"person", "collaborator", "joint_project"}


# --- checking one link again ----------------------------------------------------------------------------------------------------------------------------------------


def test_one_link_can_be_checked_again_and_a_good_answer_clears_the_report(db, monkeypatch):
    make_user("ada@example.org", Preset.ADMINISTRATIVE)
    ada = browser_for("ada@example.org")
    chosen = report_one_of_each(db)
    row = chosen["collaborator"]
    monkeypatch.setattr(links, "fetch", ok)
    answer = ada.post(f"{PROBLEMS}/{row.id}/check")
    assert answer.status_code == 200 and answer.json() == {"state": "ok", "detail": None, "reported": False}
    assert row.url not in [p["url"] for p in ada.get(PROBLEMS).json()["problems"] if p["source_type"] == "collaborator" and p["id"] == row.id]


def test_a_link_that_still_fails_counts_one_more_failure(db, monkeypatch):
    make_user("ada@example.org", Preset.ADMINISTRATIVE)
    ada = browser_for("ada@example.org")
    row = report_one_of_each(db)["person"]
    monkeypatch.setattr(links, "fetch", lambda url: links.Outcome(links.BROKEN, "500 Internal Server Error"))
    answer = ada.post(f"{PROBLEMS}/{row.id}/check")
    assert answer.json() == {"state": "broken", "detail": "500 Internal Server Error", "reported": True}
    db.expire_all()
    assert db.get(LinkCheck, row.id).failures == 4


def test_a_link_of_content_the_user_does_not_keep_cannot_be_checked(db, monkeypatch):
    make_user("pia@example.org", Preset.PROJECTS_OWNER)
    pia = browser_for("pia@example.org")
    row = report_one_of_each(db)["person"]
    monkeypatch.setattr(links, "fetch", ok)
    answer = pia.post(f"{PROBLEMS}/{row.id}/check")
    assert answer.status_code == 403 and answer.json()["detail"]["code"] == "not_allowed"
    db.expire_all()
    assert db.get(LinkCheck, row.id).state == links.BROKEN


def test_an_unknown_link_or_one_whose_address_was_changed_is_not_found(db, visitor, monkeypatch):
    assert visitor.post(f"{PROBLEMS}/1/check").status_code == 401
    make_user("ada@example.org", Preset.ADMINISTRATIVE)
    ada = browser_for("ada@example.org")
    assert ada.post(f"{PROBLEMS}/999999/check").status_code == 404
    row = report_one_of_each(db)["collaborator"]
    db.get(Collaborator, int(row.source_key)).url = "https://www.example.org/changed"
    db.commit()
    monkeypatch.setattr(links, "fetch", ok)
    answer = ada.post(f"{PROBLEMS}/{row.id}/check")
    assert answer.status_code == 404 and answer.json()["detail"]["code"] == "link_not_found"


def test_a_check_from_another_site_is_refused(db):
    make_user("ada@example.org", Preset.ADMINISTRATIVE)
    ada = browser_for("ada@example.org")
    row = report_one_of_each(db)["person"]
    assert ada.post(f"{PROBLEMS}/{row.id}/check", headers={"Origin": "https://evil.example"}).status_code == 403


# --- the command line ---------------------------------------------------------------------------------------------------------------------------------------------------


def test_the_command_checks_every_link_and_says_what_it_found(db, monkeypatch):
    monkeypatch.setattr(links, "fetch", ok)
    lines = []
    assert manage.run(["check-links", "--workers", "2"], out=lines.append) == 0
    assert len(lines) == 1 and "Checked " in lines[0] and "0 are reported" in lines[0]
    assert db.scalar(select(LinkCheck.last_checked_at).limit(1)) is not None


# --- the checker itself -------------------------------------------------------------------------------------------------------------------------------------------------


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):  # noqa: N802
        routes = {
            "/fine": (200, None),
            "/gone": (404, None),
            "/broken": (500, None),
            "/refuses": (403, None),
            "/moved": (301, "/fine"),
            "/loop": (302, "/loop"),
            "/to-gone": (302, "/gone"),
        }
        status, location = routes.get(self.path.split("?")[0], (404, None))
        self.send_response(status)
        if location:
            self.send_header("Location", location)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def log_message(self, *args):
        pass


@pytest.fixture
def server():
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{httpd.server_address[1]}"
    httpd.shutdown()
    httpd.server_close()


@pytest.mark.parametrize(
    "path, state, detail",
    [
        ("/fine", links.OK, None),
        ("/fine?with=a-query", links.OK, None),
        ("/moved", links.OK, None),  # a redirect is followed
        ("/gone", links.BROKEN, "404 Not Found"),
        ("/to-gone", links.BROKEN, "404 Not Found"),
        ("/broken", links.BROKEN, "500 Internal Server Error"),
        ("/loop", links.BROKEN, "Too many redirects"),
    ],
)
def test_the_fetcher_says_what_an_address_answers(server, path, state, detail):
    outcome = links.fetch(server + path, timeout=3, allow_private=True)
    assert (outcome.state, outcome.detail) == (state, detail)


def test_a_site_that_refuses_programs_is_blocked_not_broken(server):
    outcome = links.fetch(server + "/refuses", timeout=3, allow_private=True)
    assert outcome.state == links.BLOCKED and "403" in outcome.detail


def test_an_address_nobody_answers_is_broken(server):
    host, port = server.rsplit(":", 1)
    closed = f"{host}:{int(port) + 1}"  # nothing listens there
    assert links.fetch(closed + "/", timeout=3, allow_private=True) == links.Outcome(links.BROKEN, "Could not connect")


@pytest.mark.parametrize("url", ["ftp://example.org/file", "javascript:alert(1)", "file:///etc/passwd", "//example.org/x", "not an address"])
def test_only_web_addresses_are_asked_for(url):
    assert links.fetch(url, timeout=2) == links.Outcome(links.BROKEN, "Not a web address")


@pytest.mark.parametrize("address", ["127.0.0.1", "10.1.2.3", "172.16.0.9", "192.168.1.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "::1", "fe80::1", "fc00::1"])
def test_the_checker_never_goes_to_a_private_or_reserved_address(server, address):
    host = f"[{address}]" if ":" in address else address
    outcome = links.fetch(f"http://{host}:{server.rsplit(':', 1)[1]}/fine", timeout=2)
    assert outcome == links.Outcome(links.BROKEN, "The address is not on the public internet")


def test_a_name_that_points_to_this_computer_is_refused_too():
    assert links.fetch("http://localhost/fine", timeout=2) == links.Outcome(links.BROKEN, "The address is not on the public internet")


def test_a_public_address_is_let_through_without_asking_the_network():
    assert links._public_address("93.184.216.34", 80, allow_private=False) == "93.184.216.34"
