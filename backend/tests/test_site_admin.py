"""The parts of the site the administrative staff keep, through the admin: the collaborators and joint projects of the Collaborations page, the footer's numbers and the paragraphs under
the titles of the People and Collaborations pages (app/internal/collaborators.py, joint_projects.py and site.py; app/services/collaborations.py and site.py). Who may, what is checked,
what the public pages show afterwards, what is recorded. Every test leaves the seed as it was."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.core.config import settings
from app.db.session import SessionLocal
from app.main import app
from app.models.audit import AuditLog
from app.models.collaboration import Collaborator, JointProject
from app.models.page import PageText
from app.models.site import SiteContact
from app.services.grants import Preset
from tests.admin_helpers import browser_for, cleanup_admin_data, image_bytes, make_user
from tests.conftest import seed_everything

COLLAB = "/api/admin/collaborators"
JOINT = "/api/admin/joint-projects"
CONTACT = "/api/admin/site/contact"
PAGE = "/api/admin/site/pages"


def remove_stray_logos():
    """Logo files that no collaborator names any more (an upload of a test)."""
    with SessionLocal() as db:
        kept = {path for path in db.scalars(select(Collaborator.logo)) if path}
    folder = settings.media_dir / "collaborators"
    if folder.exists():
        for file in folder.rglob("*"):
            if file.is_file() and file.relative_to(settings.media_dir).as_posix() not in kept:
                file.unlink()


@pytest.fixture(autouse=True)
def clean():
    cleanup_admin_data()
    yield
    cleanup_admin_data()
    seed_everything()  # the walls, the joint projects, the numbers and the paragraphs go back to what the seed says
    remove_stray_logos()


@pytest.fixture
def ada():
    """The administrative staff, logged in."""
    make_user("ada@example.org", Preset.ADMINISTRATIVE)
    return browser_for("ada@example.org")


@pytest.fixture
def visitor(database):
    return TestClient(app)


def audit_rows(action=None):
    with SessionLocal() as db:
        statement = select(AuditLog).order_by(AuditLog.id)
        if action:
            statement = statement.where(AuditLog.action == action)
        return db.scalars(statement).all()


def detail(answer):
    return answer.json()["detail"]


def count(model):
    with SessionLocal() as db:
        return db.scalar(select(func.count()).select_from(model))


def public_page(visitor):
    return visitor.get("/api/collaborations").json()


def a_collaborator(kind="university"):
    with SessionLocal() as db:
        return db.scalars(select(Collaborator).where(Collaborator.kind == kind).order_by(Collaborator.position)).first().id


def a_joint_project():
    with SessionLocal() as db:
        return db.scalars(select(JointProject).order_by(JointProject.position)).first().id


def joint(**over):
    return {
        "code": "TESTPRJ",
        "name": "A Joint Project Made For Testing",
        "funding": "EU Horizon",
        "years": "2024-2027",
        "coordinator": "Politecnico di Torino",
        "url": "https://cordis.europa.eu/project/id/1",
        "partners": ["Arup", "IREN"],
        **over,
    }


def logo_file(**kw):
    return {"logo": ("logo.png", image_bytes("PNG", size=(800, 400), mode="RGBA", color=(10, 100, 200, 120), **kw), "image/png")}


# --- who may --------------------------------------------------------------------------------------------------------------------------------------------------------


def test_nobody_logged_in_may_use_any_of_the_routes(visitor):
    collaborator_id, project_id = a_collaborator(), a_joint_project()
    for answer in (
        visitor.get(COLLAB),
        visitor.get(f"{COLLAB}/{collaborator_id}"),
        visitor.post(COLLAB, data={"kind": "company", "name": "X"}),
        visitor.patch(f"{COLLAB}/{collaborator_id}", data={"name": "X"}),
        visitor.delete(f"{COLLAB}/{collaborator_id}"),
        visitor.get(JOINT),
        visitor.post(JOINT, json=joint()),
        visitor.patch(f"{JOINT}/{project_id}", json={"years": "2000"}),
        visitor.delete(f"{JOINT}/{project_id}"),
        visitor.patch(CONTACT, json={"phone": "+39 011 000 0000"}),
        visitor.put(f"{PAGE}/people", json={"intro": "x"}),
    ):
        assert answer.status_code == 401


def test_only_those_with_the_site_grant_may_use_any_of_the_routes():
    make_user("tom@example.org", Preset.THEME_OWNER)
    make_user("pia@example.org", Preset.PROJECTS_OWNER)
    make_user("none@example.org")
    collaborator_id, project_id = a_collaborator(), a_joint_project()
    before = (count(Collaborator), count(JointProject))
    for email in ("tom@example.org", "pia@example.org", "none@example.org"):
        browser = browser_for(email)
        for answer in (
            browser.get(COLLAB),
            browser.get(f"{COLLAB}/{collaborator_id}"),
            browser.post(COLLAB, data={"kind": "company", "name": "X"}),
            browser.patch(f"{COLLAB}/{collaborator_id}", data={"name": "X"}),
            browser.delete(f"{COLLAB}/{collaborator_id}"),
            browser.get(JOINT),
            browser.post(JOINT, json=joint()),
            browser.patch(f"{JOINT}/{project_id}", json={"years": "2000"}),
            browser.delete(f"{JOINT}/{project_id}"),
            browser.patch(CONTACT, json={"phone": "+39 011 000 0000"}),
            browser.put(f"{PAGE}/people", json={"intro": "Something else."}),
        ):
            assert answer.status_code == 403 and detail(answer)["code"] == "not_allowed", email
    assert (count(Collaborator), count(JointProject)) == before
    assert {row.action for row in audit_rows()} <= {"user.create", "grant.add"}  # making the accounts, and nothing of the site


def test_a_post_from_another_site_is_refused(ada):
    before = count(Collaborator)
    assert ada.post(COLLAB, data={"kind": "company", "name": "X"}, headers={"Origin": "https://evil.example"}).status_code == 403
    assert ada.patch(CONTACT, json={"phone": "+39 011 000 0000"}, headers={"Origin": "https://evil.example"}).status_code == 403
    assert count(Collaborator) == before


# --- the collaborators --------------------------------------------------------------------------------------------------------------------------------------------


def test_the_list_has_every_collaborator_wall_by_wall_in_the_order_of_the_page(ada, visitor):
    listed = ada.get(COLLAB).json()
    page = public_page(visitor)
    expected = [c["name"] for wall in ("universities", "institutes", "companies") for c in page[wall]]
    assert [c["name"] for c in listed] == expected
    assert [c["kind"] for c in listed] == ["university"] * len(page["universities"]) + ["institute"] * len(page["institutes"]) + ["company"] * len(page["companies"])


def test_a_new_collaborator_goes_last_in_its_wall(ada, visitor):
    before = public_page(visitor)
    answer = ada.post(COLLAB, data={"kind": "company", "name": "  Acme   Chips ", "url": "https://www.acme.example/en"})
    assert answer.status_code == 201, answer.text
    body = answer.json()
    assert body["name"] == "Acme Chips" and body["kind"] == "company" and body["url"] == "https://www.acme.example/en" and body["logo_url"] is None
    after = public_page(visitor)
    assert [c["name"] for c in after["companies"]] == [c["name"] for c in before["companies"]] + ["Acme Chips"]
    assert after["universities"] == before["universities"] and after["institutes"] == before["institutes"]
    (row,) = audit_rows("collaborator.add")
    assert row.user_email == "ada@example.org" and row.after["name"] == "Acme Chips"


def test_a_logo_is_checked_made_smaller_and_stored_under_a_name_made_here(ada, visitor):
    answer = ada.post(COLLAB, data={"kind": "university", "name": "Test University"}, files=logo_file())
    assert answer.status_code == 201, answer.text
    logo_url = answer.json()["logo_url"]
    assert logo_url and "/media/collaborators/test-university-" in logo_url and logo_url.endswith(".png")  # transparency is kept, so it stays a PNG
    stored = settings.media_dir / "collaborators" / logo_url.rsplit("/", 1)[1]
    assert stored.is_file()
    from PIL import Image

    with Image.open(stored) as picture:
        assert max(picture.size) <= 600  # a logo is shown small
    assert public_page(visitor)["universities"][-1]["logo_url"] == logo_url


@pytest.mark.parametrize(
    "files, code",
    [
        ({"logo": ("logo.svg", b"<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>", "image/svg+xml")}, "logo_invalid"),
        ({"logo": ("logo.png", b"this is not a picture", "image/png")}, "logo_invalid"),
        ({"logo": ("logo.png", b"x" * (5 * 1024 * 1024 + 10), "image/png")}, "logo_too_large"),
    ],
)
def test_a_file_that_is_not_a_usable_logo_is_refused_and_nothing_is_added(ada, files, code):
    before = count(Collaborator)
    answer = ada.post(COLLAB, data={"kind": "university", "name": "Test University"}, files=files)
    assert answer.status_code in (413, 422) and detail(answer)["code"] == code
    assert count(Collaborator) == before and audit_rows("collaborator.add") == []


@pytest.mark.parametrize(
    "data, field",
    [
        ({"kind": "company", "name": ""}, "name"),
        ({"kind": "company", "name": "<b>x</b>"}, "name"),
        ({"kind": "company", "name": "x" * 201}, "name"),
        ({"kind": "bank", "name": "Acme"}, "kind"),
        ({"kind": "company", "name": "Acme", "url": "javascript:alert(1)"}, "url"),
        ({"kind": "company", "name": "Acme", "url": "acme.example"}, "url"),
    ],
)
def test_a_collaborator_that_is_not_acceptable_is_refused_and_nothing_is_added(ada, data, field):
    before = count(Collaborator)
    answer = ada.post(COLLAB, data=data)
    assert answer.status_code == 422 and detail(answer)["code"] == "invalid_input" and detail(answer)["field"] == field
    assert count(Collaborator) == before


def test_a_name_that_is_in_the_wall_already_is_refused_whatever_its_capitals_but_may_be_in_another_wall(ada):
    with SessionLocal() as db:
        existing = db.get(Collaborator, a_collaborator("company"))
        name = existing.name
    before = count(Collaborator)
    answer = ada.post(COLLAB, data={"kind": "company", "name": name.upper()})
    assert answer.status_code == 409 and detail(answer)["code"] == "name_taken"
    assert count(Collaborator) == before
    assert ada.post(COLLAB, data={"kind": "institute", "name": name}).status_code == 201  # the same name in another wall is another collaborator


def test_a_collaborator_can_be_corrected_and_an_address_or_logo_removed(ada, visitor):
    collaborator_id = a_collaborator()
    one = ada.get(f"{COLLAB}/{collaborator_id}").json()
    assert one["logo_url"] and one["url"]
    answer = ada.patch(f"{COLLAB}/{collaborator_id}", data={"name": "Renamed University", "clear": ["url", "logo"]})
    assert answer.status_code == 200
    body = answer.json()
    assert body["name"] == "Renamed University" and body["url"] is None and body["logo_url"] is None and body["position"] == one["position"]
    (row,) = audit_rows("collaborator.update")
    assert row.before["name"] == one["name"] and row.after["name"] == "Renamed University" and row.after["logo"] is None
    assert not (settings.media_dir / one["logo_url"].split("/media/", 1)[1]).exists()  # the logo file went with it


def test_a_new_logo_replaces_the_old_one_and_the_old_file_is_removed(ada):
    collaborator_id = a_collaborator()
    old = ada.get(f"{COLLAB}/{collaborator_id}").json()["logo_url"]
    answer = ada.patch(f"{COLLAB}/{collaborator_id}", files=logo_file())
    assert answer.status_code == 200
    new = answer.json()["logo_url"]
    assert new and new != old
    assert (settings.media_dir / new.split("/media/", 1)[1]).is_file()
    assert not (settings.media_dir / old.split("/media/", 1)[1]).exists()


def test_a_new_logo_and_a_removed_one_together_are_refused(ada):
    collaborator_id = a_collaborator()
    one = ada.get(f"{COLLAB}/{collaborator_id}").json()
    answer = ada.patch(f"{COLLAB}/{collaborator_id}", data={"clear": ["logo"]}, files=logo_file())
    assert answer.status_code == 422 and detail(answer)["field"] == "logo"
    assert ada.get(f"{COLLAB}/{collaborator_id}").json() == one


def test_a_collaborator_moved_to_another_wall_goes_last_there(ada, visitor):
    collaborator_id = a_collaborator("university")
    one = ada.get(f"{COLLAB}/{collaborator_id}").json()
    answer = ada.patch(f"{COLLAB}/{collaborator_id}", data={"kind": "institute"})
    assert answer.status_code == 200
    page = public_page(visitor)
    assert page["institutes"][-1]["name"] == one["name"]
    assert one["name"] not in [c["name"] for c in page["universities"]]


def test_a_correction_that_is_not_acceptable_or_changes_nothing_leaves_the_collaborator_as_it_was(ada):
    collaborator_id = a_collaborator()
    one = ada.get(f"{COLLAB}/{collaborator_id}").json()
    for data in ({"kind": "bank"}, {"name": "<i>"}, {"url": "ftp://x.example"}, {"clear": ["position"]}):
        assert ada.patch(f"{COLLAB}/{collaborator_id}", data=data).status_code == 422, data
    assert ada.patch(f"{COLLAB}/{collaborator_id}", data={"name": one["name"]}).json() == one  # nothing changed
    assert ada.get(f"{COLLAB}/{collaborator_id}").json() == one
    assert audit_rows("collaborator.update") == []


def test_a_collaborator_cannot_take_the_name_of_another_in_its_wall(ada):
    with SessionLocal() as db:
        first, second = db.scalars(select(Collaborator).where(Collaborator.kind == "company").order_by(Collaborator.position).limit(2)).all()
        first_id, second_name = first.id, second.name
    answer = ada.patch(f"{COLLAB}/{first_id}", data={"name": second_name.lower()})
    assert answer.status_code == 409 and detail(answer)["code"] == "name_taken"


def test_a_collaborator_can_be_removed_with_its_logo_and_what_it_was_is_kept_in_the_log(ada, visitor):
    collaborator_id = a_collaborator()
    one = ada.get(f"{COLLAB}/{collaborator_id}").json()
    assert ada.delete(f"{COLLAB}/{collaborator_id}").status_code == 204
    assert one["name"] not in [c["name"] for c in public_page(visitor)["universities"]]
    assert ada.get(f"{COLLAB}/{collaborator_id}").status_code == 404
    assert not (settings.media_dir / one["logo_url"].split("/media/", 1)[1]).exists()
    (row,) = audit_rows("collaborator.delete")
    assert row.before["name"] == one["name"] and row.entity_key == str(collaborator_id)


def test_an_unknown_collaborator_is_not_found(ada):
    for answer in (ada.get(f"{COLLAB}/999999"), ada.patch(f"{COLLAB}/999999", data={"name": "x"}), ada.delete(f"{COLLAB}/999999")):
        assert answer.status_code == 404 and detail(answer)["code"] == "collaborator_not_found"


# --- the joint projects ------------------------------------------------------------------------------------------------------------------------------------------


def test_the_joint_projects_are_listed_as_the_page_shows_them(ada, visitor):
    listed = ada.get(JOINT).json()
    shown = public_page(visitor)["joint_projects"]
    assert [p["code"] for p in listed] == [p["code"] for p in shown]
    assert listed[0]["partners"] == shown[0]["partners"] and listed[0]["id"]


def test_a_new_joint_project_goes_last(ada, visitor):
    answer = ada.post(JOINT, json=joint(partners=["Arup", "  ", "IREN", "Arup  Ltd"]))
    assert answer.status_code == 201, answer.text
    assert answer.json()["partners"] == ["Arup", "IREN", "Arup Ltd"]  # empty names are dropped, spaces tidied
    assert public_page(visitor)["joint_projects"][-1]["code"] == "TESTPRJ"
    (row,) = audit_rows("joint_project.add")
    assert row.after["code"] == "TESTPRJ"


def test_a_joint_project_may_have_no_other_partners(ada):
    body = joint()
    del body["partners"]
    assert ada.post(JOINT, json=body).json()["partners"] == []


@pytest.mark.parametrize(
    "over, field",
    [
        ({"code": ""}, "code"),
        ({"code": "x" * 51}, "code"),
        ({"name": "<b>"}, "name"),
        ({"funding": ""}, "funding"),
        ({"years": "y" * 21}, "years"),
        ({"coordinator": ""}, "coordinator"),
        ({"url": ""}, "url"),
        ({"url": "javascript:alert(1)"}, "url"),
        ({"partners": ["<script>"]}, "partners"),
        ({"partners": [f"Partner {n}" for n in range(41)]}, "partners"),
    ],
)
def test_a_joint_project_that_is_not_acceptable_is_refused_and_nothing_is_added(ada, over, field):
    before = count(JointProject)
    answer = ada.post(JOINT, json=joint(**over))
    assert answer.status_code == 422 and detail(answer)["field"] == field, answer.text
    assert count(JointProject) == before


def test_a_joint_project_with_a_missing_or_unknown_field_is_refused(ada):
    body = joint()
    del body["coordinator"]
    assert ada.post(JOINT, json=body).status_code == 422
    assert ada.post(JOINT, json=joint(position=0)).status_code == 422


def test_a_code_that_another_joint_project_has_is_refused_whatever_its_capitals(ada):
    with SessionLocal() as db:
        taken = db.get(JointProject, a_joint_project()).code
    answer = ada.post(JOINT, json=joint(code=taken.lower()))
    assert answer.status_code == 409 and detail(answer)["code"] == "code_taken"


def test_a_joint_project_can_be_corrected_and_a_change_that_changes_nothing_is_not_recorded(ada):
    project_id = a_joint_project()
    one = ada.get(f"{JOINT}/{project_id}").json()
    answer = ada.patch(f"{JOINT}/{project_id}", json={"years": "2010-2012", "partners": ["Arup"]})
    assert answer.status_code == 200 and answer.json()["years"] == "2010-2012" and answer.json()["partners"] == ["Arup"]
    (row,) = audit_rows("joint_project.update")
    assert row.before["years"] == one["years"] and row.after["years"] == "2010-2012"
    assert ada.patch(f"{JOINT}/{project_id}", json={"years": "2010-2012"}).status_code == 200
    assert len(audit_rows("joint_project.update")) == 1
    assert ada.patch(f"{JOINT}/{project_id}", json={"url": "javascript:alert(1)"}).status_code == 422
    assert ada.patch(f"{JOINT}/{project_id}", json={"code": ""}).status_code == 422


def test_a_joint_project_can_be_removed(ada, visitor):
    project_id = a_joint_project()
    one = ada.get(f"{JOINT}/{project_id}").json()
    assert ada.delete(f"{JOINT}/{project_id}").status_code == 204
    assert one["code"] not in [p["code"] for p in public_page(visitor)["joint_projects"]]
    (row,) = audit_rows("joint_project.delete")
    assert row.before["code"] == one["code"]


def test_an_unknown_joint_project_is_not_found(ada):
    for answer in (ada.get(f"{JOINT}/999999"), ada.patch(f"{JOINT}/999999", json={"years": "2000"}), ada.delete(f"{JOINT}/999999")):
        assert answer.status_code == 404 and detail(answer)["code"] == "joint_project_not_found"


# --- the footer's numbers ------------------------------------------------------------------------------------------------------------------------------------------


def test_the_numbers_of_the_footer_can_be_changed_and_the_phone_link_follows(ada, visitor):
    answer = ada.patch(CONTACT, json={"phone": "+39  011 090  1234", "fax": "+39 011 090 5678"})
    assert answer.status_code == 200
    assert answer.json() == {"phone": "+39 011 090 1234", "phone_dial": "+390110901234", "fax": "+39 011 090 5678"}
    assert visitor.get("/api/site").json() == answer.json()
    (row,) = audit_rows("site.contact")
    assert row.after == {"phone": "+39 011 090 1234", "fax": "+39 011 090 5678"} and row.before["phone"]


def test_only_the_number_that_is_sent_changes_and_one_sent_empty_is_removed(ada, visitor):
    before = visitor.get("/api/site").json()
    answer = ada.patch(CONTACT, json={"fax": None})
    assert answer.status_code == 200
    assert answer.json()["fax"] is None and answer.json()["phone"] == before["phone"]
    assert visitor.get("/api/site").json()["fax"] is None  # the footer leaves that line out
    assert ada.patch(CONTACT, json={"phone": ""}).json()["phone_dial"] is None


@pytest.mark.parametrize("number", ["abc", "12345", "+39 011 090 56789 0123", "0110905678; DROP TABLE", "<b>011 090 5678</b>", "011+090 5678", "tel: 011 090 5678"])
def test_a_number_that_is_not_a_phone_number_is_refused(ada, visitor, number):
    before = visitor.get("/api/site").json()
    answer = ada.patch(CONTACT, json={"phone": number})
    assert answer.status_code == 422 and detail(answer)["field"] == "phone", number
    assert visitor.get("/api/site").json() == before and audit_rows("site.contact") == []


def test_numbers_as_people_write_them_are_accepted(ada):
    for number in ("+39 011 090 7042", "011 0907042", "(011) 090-7042", "+39.011.090.7042"):
        assert ada.patch(CONTACT, json={"phone": number}).status_code == 200, number


def test_a_change_of_the_numbers_that_changes_nothing_is_not_recorded(ada, visitor):
    same = visitor.get("/api/site").json()
    assert ada.patch(CONTACT, json={"phone": same["phone"], "fax": same["fax"]}).status_code == 200
    assert ada.patch(CONTACT, json={}).status_code == 200
    assert audit_rows("site.contact") == []


def test_the_numbers_can_be_written_where_the_row_is_missing(ada, visitor):
    with SessionLocal() as db:
        db.query(SiteContact).delete()
        db.commit()
    assert ada.patch(CONTACT, json={"phone": "+39 011 090 7042"}).status_code == 200
    assert visitor.get("/api/site").json()["phone"] == "+39 011 090 7042" and visitor.get("/api/site").json()["fax"] is None


# --- the paragraphs of the pages -----------------------------------------------------------------------------------------------------------------------------------


@pytest.mark.parametrize("slug", ["people", "collaborations"])
def test_the_paragraph_under_the_title_of_a_page_can_be_rewritten(ada, visitor, slug):
    old = visitor.get(f"/api/pages/{slug}").json()["intro"]
    answer = ada.put(f"{PAGE}/{slug}", json={"intro": "  A new   paragraph for the page. "})
    assert answer.status_code == 200 and answer.json() == {"slug": slug, "intro": "A new paragraph for the page."}
    assert visitor.get(f"/api/pages/{slug}").json()["intro"] == "A new paragraph for the page."
    (row,) = audit_rows("page.intro")
    assert row.before == {"intro": old} and row.entity_key == slug
    assert ada.put(f"{PAGE}/{slug}", json={"intro": "A new paragraph for the page."}).status_code == 200
    assert len(audit_rows("page.intro")) == 1  # the same text again is not recorded again


@pytest.mark.parametrize("text", ["", "   ", "<b>x</b>", "x" * 1001])
def test_a_paragraph_that_is_not_acceptable_is_refused(ada, visitor, text):
    old = visitor.get("/api/pages/people").json()["intro"]
    answer = ada.put(f"{PAGE}/people", json={"intro": text})
    assert answer.status_code == 422 and detail(answer)["field"] == "intro"
    assert visitor.get("/api/pages/people").json()["intro"] == old and audit_rows("page.intro") == []


def test_a_page_that_has_no_paragraph_is_not_made(ada):
    answer = ada.put(f"{PAGE}/no-such-page", json={"intro": "x"})
    assert answer.status_code == 404 and detail(answer)["code"] == "page_not_found"
    with SessionLocal() as db:
        assert db.get(PageText, "no-such-page") is None
