"""The two social media blocks of the home page, written by the administrative staff (app/services/site.py update_social, app/internal/site.py), and read by the public site and by the check
of the links."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text

from app.db.session import SessionLocal, engine
from app.main import app
from app.models.audit import AuditLog
from app.models.link import LinkCheck
from app.models.site import SocialLink
from app.services import links
from app.services.grants import Preset
from tests.admin_helpers import browser_for, cleanup_admin_data, make_user
from tests.conftest import seed_everything

PUBLIC = "/api/site/social"


def admin_url(slug):
    return f"/api/admin/site/social/{slug}"


@pytest.fixture(autouse=True)
def clean():
    cleanup_admin_data()
    with engine.begin() as connection:
        connection.execute(text("DELETE FROM link_checks"))
    yield
    cleanup_admin_data()
    with engine.begin() as connection:
        connection.execute(text("DELETE FROM link_checks"))
    seed_everything()  # the words go back to what the seed says


@pytest.fixture
def ada():
    make_user("ada@example.org", Preset.ADMINISTRATIVE)
    return browser_for("ada@example.org")


@pytest.fixture
def visitor(database):
    return TestClient(app)


def good(**over):
    return {"label": "YouTube", "text": "A new text for the block.", "cta": "Watch our videos", "url": "https://www.youtube.com/@new", **over}


def audit_rows():
    with SessionLocal() as db:
        return list(db.scalars(select(AuditLog).where(AuditLog.action == "social.update").order_by(AuditLog.id)))


# --- what the public reads -----------------------------------------------------------------------------------------------------------------------------------------------


def test_the_public_site_reads_the_two_blocks_in_order(visitor):
    answer = visitor.get(PUBLIC)
    assert answer.status_code == 200
    blocks = answer.json()
    assert [b["slug"] for b in blocks] == ["youtube", "linkedin"]
    assert set(blocks[0]) == {"slug", "label", "text", "cta", "url"}
    assert blocks[0]["label"] == "YouTube" and blocks[0]["url"].startswith("https://www.youtube.com/")
    assert blocks[1]["label"] == "LinkedIn" and blocks[1]["url"].startswith("https://www.linkedin.com/")


def test_a_change_is_read_by_the_public_site_at_once(ada, visitor):
    assert ada.put(admin_url("youtube"), json=good()).status_code == 200
    youtube = visitor.get(PUBLIC).json()[0]
    assert youtube["text"] == "A new text for the block." and youtube["cta"] == "Watch our videos" and youtube["url"] == "https://www.youtube.com/@new"


# --- writing ----------------------------------------------------------------------------------------------------------------------------------------------------------------------


def test_a_block_is_written_whole_and_the_answer_is_what_the_site_reads(ada):
    answer = ada.put(admin_url("linkedin"), json=good(label="LinkedIn", url="https://www.linkedin.com/company/new/"))
    assert answer.status_code == 200
    assert answer.json() == {"slug": "linkedin", "label": "LinkedIn", "text": "A new text for the block.", "cta": "Watch our videos", "url": "https://www.linkedin.com/company/new/"}


def test_spaces_and_line_breaks_in_the_text_are_tidied(ada):
    answer = ada.put(admin_url("youtube"), json=good(text="  Two   lines\n of text. ", cta=" Go "))
    assert answer.json()["text"] == "Two lines of text." and answer.json()["cta"] == "Go"


def test_a_change_is_recorded_with_what_it_was_and_what_it_is(ada):
    before = ada.get(PUBLIC).json()[0]
    ada.put(admin_url("youtube"), json=good())
    row = audit_rows()[-1]
    assert row.user_email == "ada@example.org" and row.entity_type == "social" and row.entity_key == "youtube"
    assert row.before == {"label": before["label"], "text": before["text"], "cta": before["cta"], "url": before["url"]}
    assert row.after == good()


def test_saying_what_is_there_already_changes_nothing_and_writes_no_row(ada):
    ada.put(admin_url("youtube"), json=good())
    rows = len(audit_rows())
    assert ada.put(admin_url("youtube"), json=good(text="A  new text for the block.")).status_code == 200  # the same once tidied
    assert len(audit_rows()) == rows


@pytest.mark.parametrize(
    "over, field",
    [
        ({"label": ""}, "label"),
        ({"label": "   "}, "label"),
        ({"label": "L" * 31}, "label"),
        ({"text": ""}, "text"),
        ({"text": "T" * 451}, "text"),
        ({"text": "A <b>bold</b> text"}, "text"),
        ({"cta": ""}, "cta"),
        ({"cta": "C" * 61}, "cta"),
        ({"cta": "<script>"}, "cta"),
        ({"url": ""}, "url"),
        ({"url": "javascript:alert(1)"}, "url"),
        ({"url": "ftp://example.org/x"}, "url"),
        ({"url": "https://exa mple.org"}, "url"),
        ({"url": "www.youtube.com/@x"}, "url"),
        ({"url": "https://"}, "url"),
    ],
)
def test_a_block_that_is_not_acceptable_is_refused_at_its_field_and_nothing_changes(ada, visitor, over, field):
    before = visitor.get(PUBLIC).json()
    answer = ada.put(admin_url("youtube"), json=good(**over))
    assert answer.status_code == 422 and answer.json()["detail"]["field"] == field
    assert visitor.get(PUBLIC).json() == before
    assert not audit_rows()


def test_the_greatest_lengths_are_accepted(ada):
    assert ada.put(admin_url("linkedin"), json=good(label="L" * 30, text="T" * 450, cta="C" * 60)).status_code == 200


@pytest.mark.parametrize("missing", ["label", "text", "cta", "url"])
def test_every_part_is_required(ada, missing):
    body = good()
    del body[missing]
    assert ada.put(admin_url("youtube"), json=body).status_code == 422


def test_another_field_is_refused(ada):
    assert ada.put(admin_url("youtube"), json=good(position=3)).status_code == 422


@pytest.mark.parametrize("slug", ["twitter", "YouTube", "facebook", "x"])
def test_there_are_only_the_two_blocks(ada, slug):
    answer = ada.put(admin_url(slug), json=good())
    assert answer.status_code == 404 and answer.json()["detail"]["code"] == "social_not_found"
    with SessionLocal() as db:
        assert sorted(db.scalars(select(SocialLink.slug))) == ["linkedin", "youtube"]


# --- who may --------------------------------------------------------------------------------------------------------------------------------------------------------------------


def test_only_the_administrative_staff_may_write_them(visitor):
    assert visitor.put(admin_url("youtube"), json=good()).status_code == 401
    for email, preset in (("tom@example.org", Preset.THEME_OWNER), ("pia@example.org", Preset.PROJECTS_OWNER), ("dev@example.org", Preset.DEVELOPER), ("none@example.org", None)):
        make_user(email, preset)
        refused = browser_for(email).put(admin_url("youtube"), json=good())
        assert refused.status_code == 403 and refused.json()["detail"]["code"] == "not_allowed", email
    with SessionLocal() as db:
        assert db.scalar(select(SocialLink.url).where(SocialLink.slug == "youtube")).startswith("https://www.youtube.com/@edagroup")


def test_a_post_from_another_site_is_refused(ada):
    assert ada.put(admin_url("youtube"), json=good(), headers={"Origin": "https://evil.example"}).status_code == 403


# --- the check of the links -----------------------------------------------------------------------------------------------------------------------------------------------


def test_the_addresses_of_the_blocks_are_checked_and_shown_to_the_staff_who_keep_them(ada):
    with SessionLocal() as db:
        links.sync_targets(db)
        db.commit()
        rows = list(db.scalars(select(LinkCheck).where(LinkCheck.source_type == "social").order_by(LinkCheck.source_key)))
    assert [(r.source_key, r.area, r.field) for r in rows] == [("linkedin", "site", "url"), ("youtube", "site", "url")]
    assert rows[1].label == "Home page: YouTube block"


def test_a_block_whose_address_is_broken_is_reported_to_the_staff(ada):
    with SessionLocal() as db:
        links.sync_targets(db)
        db.commit()
        bad_url = db.scalar(select(LinkCheck.url).where(LinkCheck.source_type == "social", LinkCheck.source_key == "youtube"))
        for _ in range(3):  # three checks in a row that fail
            links.check_all(db, fetcher=lambda url: links.Outcome(links.BROKEN, "404 Not Found") if url == bad_url else links.Outcome(links.OK, None), workers=2)
    problems = ada.get("/api/admin/links/problems").json()["problems"]
    mine = [p for p in problems if p["source_type"] == "social"]
    assert [p["source_key"] for p in mine] == ["youtube"] and mine[0]["label"] == "Home page: YouTube block" and mine[0]["detail"] == "404 Not Found"


def test_changing_the_address_starts_its_check_again(ada):
    with SessionLocal() as db:
        links.sync_targets(db)
        db.commit()
    ada.put(admin_url("youtube"), json=good(url="https://www.youtube.com/@another"))
    with SessionLocal() as db:
        links.sync_targets(db)
        db.commit()
        row = db.scalar(select(LinkCheck).where(LinkCheck.source_type == "social", LinkCheck.source_key == "youtube"))
        assert row.url == "https://www.youtube.com/@another" and row.state == links.UNCHECKED
