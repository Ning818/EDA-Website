"""Adding, correcting and letting people leave through the admin (app/internal/people.py, app/services/people.py): who may, what is checked, what is kept, what is recorded."""
import re
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import func, select, text

from app.core.config import settings
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.audit import AuditLog
from app.models.person import GROUP_OF_TITLE, Person, Title, titles_in
from app.services import people as service
from app.services import photos
from app.services.grants import NotAllowed, Preset
from app.services.users import get_by_email
from tests.admin_helpers import browser_for, cleanup_admin_data, image_bytes, make_user
from tests.conftest import seed_everything
from tests.seed_data import PEOPLE_BY_SLUG

URL = "/api/admin/people"
ADD = {"name": "Grace Hopper", "title": "PhD Student"}


@pytest.fixture(autouse=True)
def clean():
    cleanup_admin_data()
    yield
    cleanup_admin_data()


@pytest.fixture
def restore_seed():
    """For a test that changes a seed person: the seed is loaded again afterwards, so the other tests see what the seed says."""
    yield
    seed_everything()


@pytest.fixture
def db():
    with SessionLocal() as session:
        yield session


@pytest.fixture
def visitor(database):
    return TestClient(app)


@pytest.fixture
def admin():
    """Administrative staff, logged in."""
    make_user("ada@example.org", Preset.ADMINISTRATIVE)
    return browser_for("ada@example.org")


@pytest.fixture
def owner():
    """The theme owner, logged in."""
    make_user("tom@example.org", Preset.THEME_OWNER)
    return browser_for("tom@example.org")


def count_people():
    with SessionLocal() as db:
        return db.scalar(select(func.count()).select_from(Person))


def audit_rows(action=None):
    with SessionLocal() as db:
        statement = select(AuditLog).order_by(AuditLog.id)
        if action:
            statement = statement.where(AuditLog.action == action)
        return db.scalars(statement).all()


def detail(answer):
    return answer.json()["detail"]


# --- who may --------------------------------------------------------------------------------------------------------------------------------------------------------


def test_nobody_logged_in_may_use_any_admin_route(visitor):
    assert visitor.get(f"{URL}/enrico-macii").status_code == 401
    assert visitor.get(f"{URL}/enrico-macii/leave-preview").status_code == 401
    assert visitor.post(URL, data=ADD).status_code == 401
    assert visitor.patch(f"{URL}/enrico-macii", data={"name": "x"}).status_code == 401


def test_a_user_without_the_grant_may_not_add_a_person():
    make_user("pia@example.org", Preset.PROJECTS_OWNER)
    make_user("none@example.org")
    before = count_people()
    for email in ("pia@example.org", "none@example.org"):
        answer = browser_for(email).post(URL, data=ADD)
        assert answer.status_code == 403 and detail(answer)["code"] == "not_allowed", email
    assert count_people() == before


def test_a_post_from_another_site_is_refused(admin):
    answer = admin.post(URL, data=ADD, headers={"Origin": "https://evil.example"})
    assert answer.status_code == 403
    assert count_people() == len(PEOPLE_BY_SLUG)


def test_the_administrative_staff_and_the_theme_owner_may_add_a_person(admin, owner):
    for browser, name in ((admin, "Grace Hopper"), (owner, "Ada Lovelace")):
        answer = browser.post(URL, data={"name": name, "title": "PhD Student"})
        assert answer.status_code == 201, answer.text
    assert count_people() == len(PEOPLE_BY_SLUG) + 2


# --- adding -----------------------------------------------------------------------------------------------------------------------------------------------------------


def test_a_new_person_shows_on_the_public_page_at_once(admin, visitor):
    answer = admin.post(
        URL,
        data={"name": "Grace Hopper", "title": "PhD Student", "polito": "https://www.polito.it/grace", "orcid": "https://orcid.org/0000-0000-0000-0001", "card_name": "G. Hopper"},
    )
    assert answer.status_code == 201
    body = answer.json()
    assert body["slug"] == "grace-hopper" and body["group"] == "phd-students" and body["title_short"] == "PhD Student"
    assert body["card_name"] == "G. Hopper"
    assert body["links"] == {"polito": "https://www.polito.it/grace", "orcid": "https://orcid.org/0000-0000-0000-0001"}
    assert body["can_edit"] is True and body["editable_until"] is None  # the administrative staff may always
    public = visitor.get("/api/people/grace-hopper")
    assert public.status_code == 200 and public.json()["name"] == "Grace Hopper"
    assert "can_edit" not in public.json()  # the public page never says anything about the admin


def test_a_new_person_goes_to_the_end_of_their_group(admin):
    titles = [t.value for t in titles_in(GROUP_OF_TITLE[Title.PHD_STUDENT])]
    with SessionLocal() as db:
        last = db.scalar(select(func.max(Person.position)).where(Person.title.in_(titles)))
    admin.post(URL, data={"name": "First New", "title": "PhD Student"})
    admin.post(URL, data={"name": "Second New", "title": "Research Fellow"})  # the same group
    with SessionLocal() as db:
        positions = {p.slug: p.position for p in db.scalars(select(Person).where(Person.slug.in_(["first-new", "second-new"])))}
    assert positions == {"first-new": last + 1, "second-new": last + 2}


@pytest.mark.parametrize(
    ("data", "field"),
    [
        ({"name": "", "title": "PhD Student"}, "name"),
        ({"name": "   ", "title": "PhD Student"}, "name"),
        ({"name": "<b>Grace</b>", "title": "PhD Student"}, "name"),
        ({"name": "G" * 151, "title": "PhD Student"}, "name"),
        ({"name": "Grace Hopper", "title": "Emperor"}, "title"),
        ({"name": "Grace Hopper", "title": ""}, "title"),
        ({"name": "Grace Hopper", "title": "PhD Student", "card_name": "G <script>"}, "card_name"),
        ({"name": "Grace Hopper", "title": "PhD Student", "polito": "javascript:alert(1)"}, "polito"),
        ({"name": "Grace Hopper", "title": "PhD Student", "orcid": "data:text/html,hi"}, "orcid"),
        ({"name": "Grace Hopper", "title": "PhD Student", "linkedin": "ftp://example.org/x"}, "linkedin"),
        ({"name": "Grace Hopper", "title": "PhD Student", "dept": "https://"}, "dept"),
        ({"name": "Grace Hopper", "title": "PhD Student", "iris": "https://example.org/a b"}, "iris"),
        ({"name": "Grace Hopper", "title": "PhD Student", "iris": "https://example.org/" + "a" * 500}, "iris"),
    ],
)
def test_what_may_not_be_typed_is_refused_and_nothing_is_added(admin, data, field):
    answer = admin.post(URL, data=data)
    assert answer.status_code == 422, answer.text
    assert detail(answer)["code"] == "invalid_input" and detail(answer)["field"] == field
    assert count_people() == len(PEOPLE_BY_SLUG)


def test_the_adding_is_recorded(admin):
    admin.post(URL, data={"name": "Grace Hopper", "title": "PhD Student", "polito": "https://www.polito.it/grace"})
    (row,) = audit_rows("person.add")
    assert row.user_email == "ada@example.org" and row.entity_type == "person" and row.entity_key == "grace-hopper"
    assert row.before is None
    assert row.after == {"name": "Grace Hopper", "card_name": None, "title": "PhD Student", "photo": None, "links": {"polito": "https://www.polito.it/grace"}}


# --- the same name -----------------------------------------------------------------------------------------------------------------------------------------------------


@pytest.mark.parametrize("name", ["Enrico Macii", "enrico macii", "  ENRICO   MACII ", "Macii, Enrico", "Énrico Macií"])
def test_a_name_that_is_in_the_list_is_warned_about_whatever_its_capitals_accents_or_order(admin, name):
    answer = admin.post(URL, data={"name": name, "title": "PhD Student"})
    assert answer.status_code == 409
    assert detail(answer)["code"] == "possible_duplicate"
    assert [m["slug"] for m in detail(answer)["matches"]] == ["enrico-macii"]
    assert count_people() == len(PEOPLE_BY_SLUG)


def test_the_same_name_is_added_once_it_is_confirmed_to_be_another_person(admin):
    answer = admin.post(URL, data={"name": "Enrico Macii", "title": "PhD Student", "confirm_distinct": "true"})
    assert answer.status_code == 201
    assert answer.json()["slug"] == "enrico-macii-2"  # the first one keeps its address
    assert admin.get("/api/people/enrico-macii").json()["title"] == PEOPLE_BY_SLUG["enrico-macii"]["title"]


# --- photos -----------------------------------------------------------------------------------------------------------------------------------------------------------


def photo_file(content=None, name="me.jpg", kind="image/jpeg"):
    return {"photo": (name, content if content is not None else image_bytes(), kind)}


def test_a_photo_without_the_confirmation_that_the_person_agreed_is_refused(admin):
    answer = admin.post(URL, data=ADD, files=photo_file())
    assert answer.status_code == 422 and detail(answer)["code"] == "photo_consent_required"
    assert count_people() == len(PEOPLE_BY_SLUG)


def test_a_photo_with_the_confirmation_is_stored_and_served_and_who_confirmed_is_kept(admin, visitor):
    answer = admin.post(URL, data={**ADD, "photo_consent": "true"}, files=photo_file())
    assert answer.status_code == 201, answer.text
    url = answer.json()["photo_url"]
    assert re.fullmatch(r"/media/people/grace-hopper-[0-9a-f]{10}\.jpg", url)
    served = visitor.get(url)
    assert served.status_code == 200 and served.headers["content-type"] == "image/jpeg"
    with SessionLocal() as db:
        person = db.scalar(select(Person).where(Person.slug == "grace-hopper"))
        assert person.photo_consent_by_id == get_by_email(db, "ada@example.org").id and person.photo_consent_at is not None
        assert person.created_by_id == person.photo_consent_by_id
    (row,) = audit_rows("person.add")
    assert row.after["photo"] == url.removeprefix("/media/")  # the path, never the picture


def test_a_file_that_is_not_a_photo_is_refused_whatever_it_is_called(admin):
    svg = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    for content, name, kind in ((b"just some text", "me.jpg", "image/jpeg"), (svg, "me.png", "image/png"), (svg, "me.svg", "image/svg+xml"), (b"", "me.jpg", "image/jpeg")):
        answer = admin.post(URL, data={**ADD, "photo_consent": "true"}, files=photo_file(content, name, kind))
        if content == b"":  # an empty file part is what a browser sends when no file was chosen: the person is added without a photo
            assert answer.status_code == 201 and answer.json()["photo_url"] is None
            admin.patch(f"{URL}/grace-hopper", data={"name": "Grace Hopper"})
            with SessionLocal() as db:
                db.execute(text("DELETE FROM people WHERE slug = 'grace-hopper'"))
                db.commit()
        else:
            assert answer.status_code == 422 and detail(answer)["code"] == "photo_invalid", name
    assert count_people() == len(PEOPLE_BY_SLUG)


def test_a_photo_over_the_size_limit_is_refused(admin):
    too_big = b"\xff\xd8" + b"0" * photos.MAX_BYTES
    answer = admin.post(URL, data={**ADD, "photo_consent": "true"}, files=photo_file(too_big))
    assert answer.status_code == 413 and detail(answer)["code"] == "photo_too_large"
    assert count_people() == len(PEOPLE_BY_SLUG)


def test_a_stored_photo_is_made_smaller_and_holds_nothing_but_the_picture(admin):
    big = image_bytes(size=(3000, 2000), exif_make="SecretCameraMake")
    assert b"SecretCameraMake" in big
    answer = admin.post(URL, data={**ADD, "photo_consent": "true"}, files=photo_file(big))
    stored = (settings.media_dir / answer.json()["photo_url"].removeprefix("/media/")).read_bytes()
    assert b"SecretCameraMake" not in stored
    with Image.open(__import__("io").BytesIO(stored)) as image:
        assert max(image.size) == photos.MAX_SIDE and len(image.getexif()) == 0


def test_a_picture_with_transparent_parts_stays_a_png(admin):
    data = image_bytes("PNG", mode="RGBA", color=(10, 20, 30, 0))
    answer = admin.post(URL, data={**ADD, "photo_consent": "true"}, files=photo_file(data, "me.png", "image/png"))
    assert answer.json()["photo_url"].endswith(".png")


def test_the_file_name_comes_from_the_person_never_from_the_upload(admin):
    answer = admin.post(URL, data={**ADD, "photo_consent": "true"}, files=photo_file(name="../../../evil.jpg"))
    assert answer.status_code == 201
    assert re.fullmatch(r"people/grace-hopper-[0-9a-f]{10}\.jpg", answer.json()["photo_url"].removeprefix("/media/"))
    assert not (settings.media_dir.parent / "evil.jpg").exists()


# --- correcting, and the day a person's creator has --------------------------------------------------------------------------------------------------------------------


def test_the_administrative_staff_may_change_anyone(admin, restore_seed):
    answer = admin.patch(f"{URL}/enrico-macii", data={"polito": "https://www.polito.it/new-page", "clear": ["iris"]})
    assert answer.status_code == 200
    links = answer.json()["links"]
    assert links["polito"] == "https://www.polito.it/new-page" and "iris" not in links  # cleared: removed
    (row,) = audit_rows("person.update")
    assert row.before["links"] != row.after["links"] and row.entity_key == "enrico-macii"


def test_the_theme_owner_may_not_change_a_person_from_the_seed(owner):
    answer = owner.patch(f"{URL}/enrico-macii", data={"name": "Someone Else"})
    assert answer.status_code == 403 and detail(answer)["code"] == "not_allowed"
    assert owner.get(f"{URL}/enrico-macii").json()["can_edit"] is False


def test_the_one_who_added_a_person_may_correct_them_for_a_day(owner, db):
    answer = owner.post(URL, data={"name": "Grace Hoper", "title": "PhD Student"})  # a typing mistake
    assert answer.status_code == 201
    body = answer.json()
    assert body["can_edit"] is True and body["editable_until"] is not None
    fixed = owner.patch(f"{URL}/{body['slug']}", data={"name": "Grace Hopper"})
    assert fixed.status_code == 200 and fixed.json()["name"] == "Grace Hopper" and fixed.json()["slug"] == "grace-hoper"  # the address stays

    # a day later it is the administrative staff's
    with engine.begin() as connection:
        connection.execute(text("UPDATE people SET created_at = created_at - interval '25 hours' WHERE slug = 'grace-hoper'"))
    assert owner.patch(f"{URL}/grace-hoper", data={"name": "Grace M. Hopper"}).status_code == 403
    assert owner.get(f"{URL}/grace-hoper").json()["can_edit"] is False


def test_the_day_ends_on_the_minute_not_before(owner, db):
    owner.post(URL, data={"name": "Grace Hopper", "title": "PhD Student"})
    actor = get_by_email(db, "tom@example.org")
    person = service.get_person(db, "grace-hopper")
    just_in = person.created_at + timedelta(hours=23, minutes=59)
    just_out = person.created_at + timedelta(hours=24, seconds=1)
    assert service.can_edit_person(db, actor, person, just_in)
    assert not service.can_edit_person(db, actor, person, just_out)
    with pytest.raises(NotAllowed):
        service.update_person(db, actor, "grace-hopper", {"name": "Grace M. Hopper"}, now=just_out)


def test_another_theme_owner_may_not_correct_a_person_they_did_not_add(owner):
    owner.post(URL, data={"name": "Grace Hopper", "title": "PhD Student"})
    make_user("rae@example.org", Preset.THEME_OWNER)
    other = browser_for("rae@example.org")
    assert other.patch(f"{URL}/grace-hopper", data={"name": "Someone"}).status_code == 403


def test_the_administrative_staff_may_change_a_person_long_after_the_day(admin, owner):
    owner.post(URL, data={"name": "Grace Hopper", "title": "PhD Student"})
    with engine.begin() as connection:
        connection.execute(text("UPDATE people SET created_at = created_at - interval '30 days' WHERE slug = 'grace-hopper'"))
    assert admin.patch(f"{URL}/grace-hopper", data={"name": "Grace M. Hopper"}).status_code == 200


def test_a_new_photo_replaces_the_old_one_and_needs_the_confirmation_again(admin):
    first = admin.post(URL, data={**ADD, "photo_consent": "true"}, files=photo_file(image_bytes(color=(1, 2, 3)))).json()["photo_url"]
    refused = admin.patch(f"{URL}/grace-hopper", files=photo_file(image_bytes(color=(9, 9, 9))))
    assert refused.status_code == 422 and detail(refused)["code"] == "photo_consent_required"
    second = admin.patch(f"{URL}/grace-hopper", data={"photo_consent": "true"}, files=photo_file(image_bytes(color=(9, 9, 9)))).json()["photo_url"]
    assert second != first
    assert not (settings.media_dir / first.removeprefix("/media/")).exists() and (settings.media_dir / second.removeprefix("/media/")).exists()


def test_changing_a_title_to_one_of_another_group_moves_the_person_to_the_end_of_that_group(admin):
    admin.post(URL, data=ADD)
    professors = [t.value for t in titles_in(GROUP_OF_TITLE[Title.ASSOCIATE_PROFESSOR])]
    with SessionLocal() as db:
        last = db.scalar(select(func.max(Person.position)).where(Person.title.in_(professors)))
    answer = admin.patch(f"{URL}/grace-hopper", data={"title": "Associate Professor"})
    assert answer.status_code == 200 and answer.json()["group"] == "professors"
    with SessionLocal() as db:
        assert db.scalar(select(Person.position).where(Person.slug == "grace-hopper")) == last + 1


# --- leaving ----------------------------------------------------------------------------------------------------------------------------------------------------------


def test_who_would_lose_a_contact_is_shown_before_the_person_leaves(admin):
    preview = admin.get(f"{URL}/santa-di-cataldo/leave-preview")
    assert preview.status_code == 200
    assert {a["theme_slug"]: a["contacts_left"] for a in preview.json()} == {"bioinformatics": 0, "industry-4-0": 3}
    assert admin.get(f"{URL}/enrico-macii/leave-preview").json() == []  # a contact of no theme


def test_a_person_who_leaves_goes_out_of_the_contacts_and_stays_in_the_topics(admin, visitor, restore_seed):
    slug = "santa-di-cataldo"
    asked = admin.patch(f"{URL}/{slug}", data={"title": "Former member"})
    assert asked.status_code == 409 and detail(asked)["code"] == "leave_needs_confirmation"
    assert {a["theme_slug"] for a in detail(asked)["affected"]} == {"bioinformatics", "industry-4-0"}
    assert admin.get(f"{URL}/{slug}").json()["title"] == PEOPLE_BY_SLUG[slug]["title"]  # nothing happened yet
    assert len(visitor.get("/api/themes/bioinformatics").json()["refer_to"]) == 1

    done = admin.patch(f"{URL}/{slug}", data={"title": "Former member", "confirm_leave": "true"})
    assert done.status_code == 200 and done.json()["group"] == "alumni" and done.json()["title_short"] == "Former member"

    bioinformatics = visitor.get("/api/themes/bioinformatics").json()
    assert bioinformatics["refer_to"] == []  # the last contact left: the section is just empty
    industry = visitor.get("/api/themes/industry-4-0").json()
    assert slug not in [p["slug"] for p in industry["refer_to"]] and len(industry["refer_to"]) == 3
    for theme in (bioinformatics, industry):  # still among the people involved, now as a Former member
        involved = [p for group in theme["topic_groups"] for p in group["people"] if p["slug"] == slug]
        assert involved and all(p["title"] == "Former member" and p["title_short"] == "Former member" for p in involved)

    (row,) = audit_rows("person.leave")
    assert row.entity_key == slug and row.before["title"] == PEOPLE_BY_SLUG[slug]["title"] and row.after["title"] == "Former member"
    assert sorted(row.after["removed_from_refer_to"]) == ["bioinformatics", "industry-4-0"]


def test_a_person_who_is_no_contact_leaves_without_being_asked(admin):
    admin.post(URL, data=ADD)
    answer = admin.patch(f"{URL}/grace-hopper", data={"title": "Former member"})
    assert answer.status_code == 200 and answer.json()["group"] == "alumni"
    assert audit_rows("person.leave")[0].after["removed_from_refer_to"] == []


def test_a_person_is_never_deleted(admin):
    assert admin.delete(f"{URL}/enrico-macii").status_code == 405
    assert not [path for path, ops in app.openapi()["paths"].items() if path.startswith(URL) and "delete" in ops]


# --- all or nothing ---------------------------------------------------------------------------------------------------------------------------------------------------


def test_when_the_photo_cannot_be_stored_the_person_is_not_added_and_nothing_is_recorded(db, monkeypatch):
    make_user("ada@example.org", Preset.ADMINISTRATIVE)
    actor = get_by_email(db, "ada@example.org")

    def broken(path, data):
        raise OSError("disk full")

    monkeypatch.setattr(photos, "write", broken)
    with pytest.raises(OSError):
        service.add_person(db, actor, ADD, image_bytes(), photo_consent=True)
    with SessionLocal() as other:
        assert other.scalar(select(Person.id).where(Person.slug == "grace-hopper")) is None
    assert audit_rows("person.add") == []


def test_when_a_change_cannot_be_completed_the_person_and_the_log_are_as_they_were(db, monkeypatch):
    make_user("ada@example.org", Preset.ADMINISTRATIVE)
    actor = get_by_email(db, "ada@example.org")
    service.add_person(db, actor, ADD)
    audit_before = len(audit_rows())

    def broken(path, data):
        raise OSError("disk full")

    monkeypatch.setattr(photos, "write", broken)
    with pytest.raises(OSError):
        service.update_person(db, actor, "grace-hopper", {"name": "Grace M. Hopper"}, image_bytes(), photo_consent=True)
    with SessionLocal() as other:
        assert other.scalar(select(Person.name).where(Person.slug == "grace-hopper")) == "Grace Hopper"
    assert len(audit_rows()) == audit_before


def test_only_the_optional_fields_can_be_cleared(admin):
    admin.post(URL, data=ADD)
    answer = admin.patch(f"{URL}/grace-hopper", data={"clear": ["name"]})
    assert answer.status_code == 422 and detail(answer)["field"] == "clear"
    assert admin.get(f"{URL}/grace-hopper").json()["name"] == "Grace Hopper"
