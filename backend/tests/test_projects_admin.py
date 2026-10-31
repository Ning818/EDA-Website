"""The funded projects through the admin (app/internal/projects.py and themes.py, app/services/projects.py): who may, what is checked, what the public pages show afterwards, what is
recorded. Every test leaves the seed as it was."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.db.session import SessionLocal
from app.main import app
from app.models.audit import AuditLog
from app.models.theme import Project, Theme
from app.services.grants import Preset
from tests.admin_helpers import browser_for, cleanup_admin_data, make_user
from tests.conftest import seed_everything

URL = "/api/admin/projects"


@pytest.fixture(autouse=True)
def clean():
    cleanup_admin_data()
    yield
    cleanup_admin_data()
    seed_everything()  # the projects and the sentences of the themes go back to what the seed says


@pytest.fixture
def pia():
    """The funded-projects owner, logged in."""
    make_user("pia@example.org", Preset.PROJECTS_OWNER)
    return browser_for("pia@example.org")


@pytest.fixture
def visitor(database):
    return TestClient(app)


def themes():
    with SessionLocal() as db:
        return [(t.id, t.slug, t.name) for t in db.scalars(select(Theme).order_by(Theme.position))]


def slug_of(index):
    return themes()[index][1]


def count_projects():
    with SessionLocal() as db:
        return db.scalar(select(func.count()).select_from(Project))


def any_project(status="ongoing"):
    with SessionLocal() as db:
        project = db.scalars(select(Project).where(Project.status == status).order_by(Project.id)).first()
        return project.id


def audit_rows(action=None):
    with SessionLocal() as db:
        statement = select(AuditLog).order_by(AuditLog.id)
        if action:
            statement = statement.where(AuditLog.action == action)
        return db.scalars(statement).all()


def detail(answer):
    return answer.json()["detail"]


def public_theme(visitor, slug):
    return visitor.get(f"/api/themes/{slug}").json()


def new(**over):
    return {"theme": slug_of(0), "description": "A NEW PROJECT FOR TESTING", **over}


# --- who may --------------------------------------------------------------------------------------------------------------------------------------------------------


def test_nobody_logged_in_may_use_any_of_the_routes(visitor):
    project_id = any_project()
    assert visitor.get(URL).status_code == 401
    assert visitor.get(f"{URL}/{project_id}").status_code == 401
    assert visitor.post(URL, json=new()).status_code == 401
    assert visitor.patch(f"{URL}/{project_id}", json={"status": "ended"}).status_code == 401
    assert visitor.put(f"/api/admin/themes/{slug_of(0)}/funded-blurb", json={"text": "x"}).status_code == 401


def test_only_the_funded_projects_owner_may_read_or_change_the_projects():
    make_user("ada@example.org", Preset.ADMINISTRATIVE)
    make_user("tom@example.org", Preset.THEME_OWNER)
    make_user("none@example.org")
    project_id = any_project()
    before = count_projects()
    for email in ("ada@example.org", "tom@example.org", "none@example.org"):
        browser = browser_for(email)
        for answer in (
            browser.get(URL),
            browser.get(f"{URL}/{project_id}"),
            browser.post(URL, json=new()),
            browser.patch(f"{URL}/{project_id}", json={"status": "ended"}),
            browser.put(f"/api/admin/themes/{slug_of(0)}/funded-blurb", json={"text": "Something else."}),
        ):
            assert answer.status_code == 403 and detail(answer)["code"] == "not_allowed", email
    assert count_projects() == before
    assert audit_rows("project.add") == [] and audit_rows("project.end") == [] and audit_rows("theme.funded_blurb") == []


def test_a_post_from_another_site_is_refused(pia):
    before = count_projects()
    assert pia.post(URL, json=new(), headers={"Origin": "https://evil.example"}).status_code == 403
    assert count_projects() == before


# --- reading ----------------------------------------------------------------------------------------------------------------------------------------------------------


def test_the_list_has_every_project_in_the_order_the_pages_show_them(pia, visitor):
    listed = pia.get(URL).json()
    assert len(listed) == count_projects()
    expected = []
    for _, slug, name in themes():
        page = public_theme(visitor, slug)["projects"]
        for status in ("ongoing", "ended"):
            expected += [(slug, name, status, p["code"], p["description"], p["url"]) for p in page[status]]
    assert [(p["theme_slug"], p["theme_name"], p["status"], p["code"], p["description"], p["url"]) for p in listed] == expected


def test_one_project_can_be_read_and_an_unknown_one_is_not_found(pia):
    project_id = any_project()
    one = pia.get(f"{URL}/{project_id}").json()
    assert one["id"] == project_id and one["status"] == "ongoing"
    missing = pia.get(f"{URL}/999999")
    assert missing.status_code == 404 and detail(missing)["code"] == "project_not_found"


# --- adding -----------------------------------------------------------------------------------------------------------------------------------------------------------


def test_a_new_project_goes_last_in_the_ongoing_list_and_the_numbers_count_it(pia, visitor):
    slug = slug_of(0)
    before = public_theme(visitor, slug)
    answer = pia.post(URL, json=new(code="NEWP", url="https://example.org/newp"))
    assert answer.status_code == 201, answer.text
    body = answer.json()
    assert body["status"] == "ongoing" and body["code"] == "NEWP" and body["url"] == "https://example.org/newp" and body["theme_slug"] == slug

    after = public_theme(visitor, slug)
    assert [p["description"] for p in after["projects"]["ongoing"]] == [p["description"] for p in before["projects"]["ongoing"]] + ["A NEW PROJECT FOR TESTING"]
    assert after["projects"]["ended"] == before["projects"]["ended"]
    assert after["stats"]["ongoing"] == before["stats"]["ongoing"] + 1 and after["stats"]["total"] == before["stats"]["total"] + 1
    assert after["funded_blurb"] == before["funded_blurb"]  # the sentence is written by hand, nothing writes it from the projects

    (row,) = audit_rows("project.add")
    assert row.user_email == "pia@example.org" and row.entity_key == str(body["id"])
    assert row.after == {"theme": slug, "status": "ongoing", "code": "NEWP", "description": "A NEW PROJECT FOR TESTING", "language": None, "url": "https://example.org/newp"}


def test_a_project_can_be_added_as_one_that_has_ended_with_no_code_and_no_address(pia, visitor):
    slug = slug_of(1)
    answer = pia.post(URL, json=new(theme=slug, status="ended"))
    assert answer.status_code == 201
    assert answer.json()["code"] is None and answer.json()["url"] is None
    ended = public_theme(visitor, slug)["projects"]["ended"]
    assert ended[-1]["description"] == "A NEW PROJECT FOR TESTING" and ended[-1]["code"] is None


@pytest.mark.parametrize(
    "over, field",
    [
        ({"description": ""}, "description"),
        ({"description": "   "}, "description"),
        ({"description": "<b>bold</b>"}, "description"),
        ({"description": "x" * 301}, "description"),
        ({"code": "<script>"}, "code"),
        ({"code": "x" * 51}, "code"),
        ({"url": "javascript:alert(1)"}, "url"),
        ({"url": "ftp://example.org/x"}, "url"),
        ({"url": "https://exa mple.org"}, "url"),
        ({"theme": "no-such-theme"}, "theme"),
        ({"status": "paused"}, "status"),
    ],
)
def test_a_project_that_is_not_acceptable_is_refused_and_nothing_is_added(pia, over, field):
    before = count_projects()
    answer = pia.post(URL, json=new(**over))
    assert answer.status_code == 422, answer.text
    assert detail(answer)["code"] == "invalid_input" and detail(answer)["field"] == field
    assert count_projects() == before and audit_rows("project.add") == []


def test_a_project_with_a_field_nobody_asked_for_is_refused(pia):
    before = count_projects()
    assert pia.post(URL, json=new(position=0)).status_code == 422
    assert count_projects() == before


# --- ending and correcting --------------------------------------------------------------------------------------------------------------------------------------------


def test_a_project_that_is_over_moves_to_the_ended_list_and_goes_last_there(pia, visitor):
    project_id = any_project()
    one = pia.get(f"{URL}/{project_id}").json()
    before = public_theme(visitor, one["theme_slug"])
    answer = pia.patch(f"{URL}/{project_id}", json={"status": "ended"})
    assert answer.status_code == 200 and answer.json()["status"] == "ended"

    after = public_theme(visitor, one["theme_slug"])
    assert one["description"] not in [p["description"] for p in after["projects"]["ongoing"]]
    assert after["projects"]["ended"][-1]["description"] == one["description"]
    assert after["stats"]["ongoing"] == before["stats"]["ongoing"] - 1 and after["stats"]["ended"] == before["stats"]["ended"] + 1
    assert after["stats"]["total"] == before["stats"]["total"]
    (row,) = audit_rows("project.end")
    assert row.before["status"] == "ongoing" and row.after["status"] == "ended" and row.entity_key == str(project_id)


def test_the_fields_of_a_project_can_be_corrected_and_an_empty_code_or_address_is_removed(pia):
    with SessionLocal() as db:
        project = db.scalars(select(Project).where(Project.code.is_not(None), Project.url.is_not(None))).first()
        project_id = project.id
    answer = pia.patch(f"{URL}/{project_id}", json={"description": "A CORRECTED DESCRIPTION", "url": None, "code": ""})
    assert answer.status_code == 200
    body = answer.json()
    assert body["description"] == "A CORRECTED DESCRIPTION" and body["url"] is None and body["code"] is None
    (row,) = audit_rows("project.update")
    assert row.before["code"] is not None and row.after["code"] is None and row.after["description"] == "A CORRECTED DESCRIPTION"


def test_a_change_that_changes_nothing_is_not_recorded(pia):
    project_id = any_project()
    one = pia.get(f"{URL}/{project_id}").json()
    answer = pia.patch(f"{URL}/{project_id}", json={"description": one["description"], "status": one["status"]})
    assert answer.status_code == 200 and answer.json() == one
    assert audit_rows("project.update") == [] and audit_rows("project.end") == []


def test_a_project_in_the_wrong_theme_can_be_moved_to_the_right_one(pia, visitor):
    project_id = any_project()
    one = pia.get(f"{URL}/{project_id}").json()
    target = next(slug for _, slug, _ in themes() if slug != one["theme_slug"])
    answer = pia.patch(f"{URL}/{project_id}", json={"theme": target})
    assert answer.status_code == 200 and answer.json()["theme_slug"] == target
    assert public_theme(visitor, target)["projects"]["ongoing"][-1]["description"] == one["description"]
    assert one["description"] not in [p["description"] for p in public_theme(visitor, one["theme_slug"])["projects"]["ongoing"]]
    (row,) = audit_rows("project.update")
    assert row.before["theme"] == one["theme_slug"] and row.after["theme"] == target


def test_a_correction_that_is_not_acceptable_leaves_the_project_as_it_was(pia):
    project_id = any_project()
    one = pia.get(f"{URL}/{project_id}").json()
    for body in ({"theme": "no-such-theme"}, {"status": "paused"}, {"description": ""}, {"url": "javascript:alert(1)"}, {"theme": ""}):
        answer = pia.patch(f"{URL}/{project_id}", json=body)
        assert answer.status_code == 422, body
    assert pia.get(f"{URL}/{project_id}").json() == one
    assert audit_rows("project.update") == []


def test_an_unknown_project_cannot_be_corrected(pia):
    answer = pia.patch(f"{URL}/999999", json={"status": "ended"})
    assert answer.status_code == 404 and detail(answer)["code"] == "project_not_found"


def test_a_project_is_never_deleted(pia):
    project_id = any_project()
    before = count_projects()
    assert pia.delete(f"{URL}/{project_id}").status_code == 405
    assert count_projects() == before


# --- the sentence about the funded projects --------------------------------------------------------------------------------------------------------------------------


def test_the_sentence_about_a_themes_projects_is_written_by_the_owner(pia, visitor):
    slug = slug_of(0)
    old = public_theme(visitor, slug)["funded_blurb"]
    url = f"/api/admin/themes/{slug}/funded-blurb"
    answer = pia.put(url, json={"text": "  Ongoing projects include   NEWP, which works on testing.  "})
    assert answer.status_code == 200
    assert answer.json()["text"] == "Ongoing projects include NEWP, which works on testing." and answer.json()["theme_slug"] == slug
    assert public_theme(visitor, slug)["funded_blurb"] == "Ongoing projects include NEWP, which works on testing."
    (row,) = audit_rows("theme.funded_blurb")
    assert row.before == {"funded_blurb": old} and row.entity_key == slug

    assert pia.put(url, json={"text": "Ongoing projects include NEWP, which works on testing."}).status_code == 200
    assert len(audit_rows("theme.funded_blurb")) == 1  # the same text again changes nothing, so it is not recorded again


@pytest.mark.parametrize("text", ["", "   ", "<b>x</b>", "x" * 601])
def test_a_sentence_that_is_not_acceptable_is_refused(pia, visitor, text):
    slug = slug_of(0)
    old = public_theme(visitor, slug)["funded_blurb"]
    answer = pia.put(f"/api/admin/themes/{slug}/funded-blurb", json={"text": text})
    assert answer.status_code == 422 and detail(answer)["field"] == "text"
    assert public_theme(visitor, slug)["funded_blurb"] == old and audit_rows("theme.funded_blurb") == []


def test_the_sentence_of_a_theme_that_does_not_exist_is_not_found(pia):
    answer = pia.put("/api/admin/themes/no-such-theme/funded-blurb", json={"text": "x"})
    assert answer.status_code == 404 and detail(answer)["code"] == "theme_not_found"


# --- the language of a description ------------------------------------------------------------------------------------------------------------------------------------


def test_the_seed_marks_the_italian_descriptions_and_the_public_pages_say_so(visitor):
    with SessionLocal() as db:
        italian = {p.code or p.description[:20] for p in db.scalars(select(Project).where(Project.language == "it"))}
        assert len(italian) == 10 and "THOR" in italian and "SCORE" in italian and "EEB" in italian and "STAMP" in italian
        assert db.scalar(select(func.count()).select_from(Project).where(Project.code == "HBP", Project.language.is_(None))) == 1
    projects = {p["code"]: p for t in themes() for status in ("ongoing", "ended") for p in public_theme(visitor, t[1])["projects"][status] if p["code"]}
    assert projects["THOR"]["language"] == "it" and projects["EEB"]["language"] == "it"
    assert projects["HBP"]["language"] is None and projects["CONTREX"]["language"] is None


def test_a_project_is_added_with_the_language_of_its_description(pia, visitor):
    answer = pia.post(URL, json=new(language="it", description="UN PROGETTO DI PROVA"))
    assert answer.status_code == 201 and answer.json()["language"] == "it"
    project_id = answer.json()["id"]
    assert pia.get(f"{URL}/{project_id}").json()["language"] == "it"
    shown = [p for p in public_theme(visitor, slug_of(0))["projects"]["ongoing"] if p["description"] == "UN PROGETTO DI PROVA"]
    assert shown and shown[0]["language"] == "it"
    assert audit_rows("project.add")[-1].after["language"] == "it"


@pytest.mark.parametrize("given", [None, "", "  ", "en", "EN"])
def test_english_is_no_language_at_all(pia, given):
    answer = pia.post(URL, json=new(language=given))
    assert answer.status_code == 201 and answer.json()["language"] is None


def test_a_project_without_a_language_is_in_english(pia):
    assert pia.post(URL, json=new()).json()["language"] is None


def test_a_language_is_read_whatever_its_case_and_spaces(pia):
    assert pia.post(URL, json=new(language=" IT ")).json()["language"] == "it"


@pytest.mark.parametrize("given", ["xx", "italian", "ita", "it-IT", "<b>", "zh"])
def test_a_language_that_is_not_offered_is_refused(pia, given):
    before = count_projects()
    answer = pia.post(URL, json=new(language=given))
    assert answer.status_code == 422 and detail(answer)["field"] == "language"
    assert count_projects() == before


def test_the_language_of_a_description_is_corrected_and_recorded(pia, visitor):
    project_id = any_project()
    changed = pia.patch(f"{URL}/{project_id}", json={"language": "fr"})
    assert changed.status_code == 200 and changed.json()["language"] == "fr"
    row = audit_rows("project.update")[-1]
    assert row.before["language"] is None and row.after["language"] == "fr"
    back = pia.patch(f"{URL}/{project_id}", json={"language": None})
    assert back.json()["language"] is None
    assert audit_rows("project.update")[-1].before["language"] == "fr"


def test_saying_the_language_that_it_is_already_changes_nothing_and_writes_no_row(pia):
    project_id = any_project()
    pia.patch(f"{URL}/{project_id}", json={"language": "de"})
    rows = len(audit_rows())
    assert pia.patch(f"{URL}/{project_id}", json={"language": "de"}).status_code == 200
    assert pia.patch(f"{URL}/{project_id}", json={"description": pia.get(f"{URL}/{project_id}").json()["description"]}).status_code == 200
    assert len(audit_rows()) == rows


def test_a_change_that_leaves_the_language_out_keeps_it(pia):
    project_id = any_project()
    pia.patch(f"{URL}/{project_id}", json={"language": "es"})
    assert pia.patch(f"{URL}/{project_id}", json={"code": "KEEPS"}).json()["language"] == "es"


def test_the_list_says_the_language_of_every_project(pia):
    listed = pia.get(URL).json()
    assert {"it", None} <= {p["language"] for p in listed}
    assert all("language" in p for p in listed)
