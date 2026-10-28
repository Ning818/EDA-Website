"""What the theme owner keeps through the admin (app/internal/themes.py, app/services/themes.py): a theme's words, its contacts, its research areas with their topics and involved people,
and its two highlight cards. Who may, what is checked, what the public pages show afterwards, what is recorded. Every test leaves the seed as it was."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.core.config import settings
from app.db.session import SessionLocal
from app.main import app
from app.models.audit import AuditLog
from app.models.person import Person
from app.models.theme import Highlight, Theme, Topic, TopicGroup, TopicGroupPerson
from app.services.grants import Preset, grant
from app.services.users import get_by_email
from app.models.grant import Area
from tests.admin_helpers import browser_for, cleanup_admin_data, image_bytes, make_user
from tests.conftest import seed_everything

THEMES = "/api/admin/themes"
AREAS = "/api/admin/areas"
TOPICS = "/api/admin/topics"


def remove_stray_pictures():
    with SessionLocal() as db:
        kept = {path for path in db.scalars(select(Highlight.image)) if path}
    folder = settings.media_dir / "highlights"
    if folder.exists():
        for file in folder.rglob("*"):
            if file.is_file() and file.relative_to(settings.media_dir).as_posix() not in kept:
                file.unlink()


@pytest.fixture(autouse=True)
def clean():
    cleanup_admin_data()
    yield
    cleanup_admin_data()
    seed_everything()  # the themes go back to what the seed says
    remove_stray_pictures()


@pytest.fixture
def tom():
    """The theme owner (every theme), logged in."""
    make_user("tom@example.org", Preset.THEME_OWNER)
    return browser_for("tom@example.org")


@pytest.fixture
def visitor(database):
    return TestClient(app)


def themes():
    with SessionLocal() as db:
        return [(t.id, t.slug, t.name) for t in db.scalars(select(Theme).order_by(Theme.position))]


def slug_of(index):
    return themes()[index][1]


def public(visitor, slug):
    return visitor.get(f"/api/themes/{slug}").json()


def audit_rows(action=None):
    with SessionLocal() as db:
        statement = select(AuditLog).order_by(AuditLog.id)
        if action:
            statement = statement.where(AuditLog.action == action)
        return db.scalars(statement).all()


def detail(answer):
    return answer.json()["detail"]


def make_user_for_one_theme(email, theme_id):
    make_user(email)
    with SessionLocal() as db:
        grant(db, get_by_email(db, email), Area.THEME, theme_id)
        db.commit()
    return browser_for(email)


def an_area(theme_index=0, nth=0):
    with SessionLocal() as db:
        theme = db.scalars(select(Theme).order_by(Theme.position)).all()[theme_index]
        area = sorted(theme.groups, key=lambda a: a.position)[nth]
        return {"id": area.id, "title": area.title, "slug": theme.slug, "topics": len(area.topics), "people": [m.person.slug for m in sorted(area.members, key=lambda m: m.position)]}


def a_topic(theme_index=0):
    with SessionLocal() as db:
        theme = db.scalars(select(Theme).order_by(Theme.position)).all()[theme_index]
        topic = sorted(theme.groups, key=lambda a: a.position)[0].topics[0]
        return topic.id


def person_slug(title=None, not_in=()):
    with SessionLocal() as db:
        statement = select(Person.slug).order_by(Person.id)
        if title:
            statement = statement.where(Person.title == title)
        return next(s for s in db.scalars(statement) if s not in not_in)


# --- who may --------------------------------------------------------------------------------------------------------------------------------------------------------


def every_route(browser, slug="bioinformatics"):
    area, topic = an_area(1)["id"], a_topic(1)
    return [
        browser.get(THEMES),
        browser.get(f"{THEMES}/{slug}"),
        browser.patch(f"{THEMES}/{slug}", json={"name": "X"}),
        browser.put(f"{THEMES}/{slug}/contacts", json={"people": []}),
        browser.post(f"{THEMES}/{slug}/areas", json={"title": "X"}),
        browser.put(f"{THEMES}/{slug}/highlights/paper", data={"title": "x"}),
        browser.patch(f"{AREAS}/{area}", json={"title": "X"}),
        browser.post(f"{AREAS}/{area}/move", json={"direction": "up"}),
        browser.get(f"{AREAS}/{area}/delete-preview"),
        browser.delete(f"{AREAS}/{area}", params={"confirm": "true"}),
        browser.post(f"{AREAS}/{area}/topics", json={"text": "X"}),
        browser.put(f"{AREAS}/{area}/people", json={"people": []}),
        browser.patch(f"{TOPICS}/{topic}", json={"text": "X"}),
        browser.post(f"{TOPICS}/{topic}/move", json={"direction": "up"}),
        browser.delete(f"{TOPICS}/{topic}"),
    ]


def test_nobody_logged_in_may_use_any_of_the_routes(visitor):
    for answer in every_route(visitor, slug_of(1)):
        assert answer.status_code == 401


def test_only_those_with_the_theme_grant_may_use_the_routes():
    make_user("ada@example.org", Preset.ADMINISTRATIVE)
    make_user("pia@example.org", Preset.PROJECTS_OWNER)
    make_user("none@example.org")
    slug = slug_of(1)
    for email in ("ada@example.org", "pia@example.org", "none@example.org"):
        browser = browser_for(email)
        listing, *others = every_route(browser, slug)
        assert listing.status_code == 200 and listing.json() == []  # the list holds the themes a user may keep: none for them
        for answer in others:
            assert answer.status_code == 403 and detail(answer)["code"] == "not_allowed", (email, answer.request.url)
    assert {row.action for row in audit_rows()} <= {"user.create", "grant.add"}  # nothing of the themes was written


def test_a_grant_for_one_theme_reaches_that_theme_only():
    (first_id, first, _), (_, second, _) = themes()[0], themes()[1]
    browser = make_user_for_one_theme("one@example.org", first_id)
    assert browser.get(f"{THEMES}/{first}").status_code == 200
    assert browser.get(f"{THEMES}/{second}").status_code == 403
    assert browser.patch(f"{THEMES}/{second}", json={"name": "X"}).status_code == 403
    assert browser.post(f"{AREAS}/{an_area(1)['id']}/topics", json={"text": "X"}).status_code == 403
    assert browser.patch(f"{TOPICS}/{a_topic(1)}", json={"text": "X"}).status_code == 403
    assert browser.patch(f"{AREAS}/{an_area(0)['id']}", json={"title": "Renamed"}).status_code == 200


def test_the_list_has_the_themes_a_user_may_keep(tom):
    assert [t["slug"] for t in tom.get(THEMES).json()] == [slug for _, slug, _ in themes()]
    browser = make_user_for_one_theme("one@example.org", themes()[2][0])
    assert [t["slug"] for t in browser.get(THEMES).json()] == [slug_of(2)]
    make_user("ada@example.org", Preset.ADMINISTRATIVE)
    assert browser_for("ada@example.org").get(THEMES).json() == []


def test_a_post_from_another_site_is_refused(tom):
    assert tom.patch(f"{THEMES}/{slug_of(0)}", json={"name": "X"}, headers={"Origin": "https://evil.example"}).status_code == 403


def test_an_unknown_theme_area_or_topic_is_not_found(tom):
    assert tom.get(f"{THEMES}/no-such-theme").status_code == 404
    assert tom.patch(f"{AREAS}/999999", json={"title": "X"}).status_code == 404
    assert tom.patch(f"{TOPICS}/999999", json={"text": "X"}).status_code == 404
    assert detail(tom.get(f"{THEMES}/no-such-theme"))["code"] == "theme_not_found"


def test_what_the_owner_reads_is_what_the_public_page_has(tom, visitor):
    slug = slug_of(0)
    mine, theirs = tom.get(f"{THEMES}/{slug}").json(), public(visitor, slug)
    assert mine["name"] == theirs["name"] and mine["intro"] == theirs["intro"]
    assert [a["title"] for a in mine["areas"]] == [g["title"] for g in theirs["topic_groups"]]
    assert [[t["text"] for t in a["topics"]] for a in mine["areas"]] == [g["topics"] for g in theirs["topic_groups"]]
    assert sorted(p["slug"] for p in mine["contacts"]) == sorted(p["slug"] for p in theirs["refer_to"])
    assert mine["highlight_paper"]["title"] == theirs["highlight_paper"]["title"] and mine["highlight_project"]["image_url"]


# --- B3: the words ------------------------------------------------------------------------------------------------------------------------------------------------


def test_the_words_of_a_theme_can_be_changed_and_the_public_pages_follow(tom, visitor):
    slug = slug_of(0)
    answer = tom.patch(f"{THEMES}/{slug}", json={"name": "  New   Name ", "short_name": "NN", "intro": "A new introduction.", "home_summary": "A new home paragraph."})
    assert answer.status_code == 200, answer.text
    body = public(visitor, slug)
    assert (body["name"], body["short_name"], body["intro"], body["home_summary"]) == ("New Name", "NN", "A new introduction.", "A new home paragraph.")
    assert [t for t in visitor.get("/api/themes").json() if t["slug"] == slug][0]["name"] == "New Name"
    (row,) = audit_rows("theme.words")
    assert row.after["name"] == "New Name" and row.before["name"] != "New Name" and row.entity_key == slug


def test_the_optional_words_sent_empty_are_removed_and_the_funded_sentence_is_left_alone(tom, visitor):
    slug = slug_of(0)
    sentence = public(visitor, slug)["funded_blurb"]
    answer = tom.patch(f"{THEMES}/{slug}", json={"short_name": "", "home_summary": None})
    assert answer.status_code == 200 and answer.json()["short_name"] is None and answer.json()["home_summary"] is None
    assert public(visitor, slug)["funded_blurb"] == sentence  # that belongs to the funded-projects owner


@pytest.mark.parametrize(
    "body, field",
    [
        ({"name": ""}, "name"),
        ({"name": "<b>X</b>"}, "name"),
        ({"name": "x" * 101}, "name"),
        ({"short_name": "x" * 51}, "short_name"),
        ({"intro": ""}, "intro"),
        ({"intro": "x" * 1001}, "intro"),
        ({"home_summary": "<i>x</i>"}, "home_summary"),
    ],
)
def test_words_that_are_not_acceptable_are_refused_and_nothing_changes(tom, visitor, body, field):
    slug = slug_of(0)
    before = public(visitor, slug)
    answer = tom.patch(f"{THEMES}/{slug}", json=body)
    assert answer.status_code == 422 and detail(answer)["field"] == field
    assert public(visitor, slug) == before and audit_rows("theme.words") == []


def test_a_change_that_changes_nothing_is_not_recorded(tom, visitor):
    slug = slug_of(0)
    assert tom.patch(f"{THEMES}/{slug}", json={"name": public(visitor, slug)["name"]}).status_code == 200
    assert tom.patch(f"{THEMES}/{slug}", json={}).status_code == 200
    assert audit_rows("theme.words") == []
    assert tom.patch(f"{THEMES}/{slug}", json={"colour": "red"}).status_code == 422  # the colours are in the code, not here


# --- B4: the contacts --------------------------------------------------------------------------------------------------------------------------------------------


def test_the_contacts_of_a_theme_can_be_chosen_from_the_people_and_ordered(tom, visitor):
    slug = slug_of(0)
    first = person_slug("Full Professor")
    second = person_slug("Full Professor", not_in=(first,))
    answer = tom.put(f"{THEMES}/{slug}/contacts", json={"people": [second, first, second]})
    assert answer.status_code == 200, answer.text
    assert [p["slug"] for p in answer.json()["contacts"]] == [second, first]  # each once, in the order given
    assert {p["slug"] for p in public(visitor, slug)["refer_to"]} == {first, second}
    (row,) = audit_rows("theme.contacts")
    assert row.after == {"contacts": [second, first]}


def test_a_theme_without_contacts_shows_no_refer_to(tom, visitor):
    slug = slug_of(0)
    assert tom.put(f"{THEMES}/{slug}/contacts", json={"people": []}).status_code == 200
    assert public(visitor, slug)["refer_to"] == []


def test_a_person_who_has_left_cannot_be_a_contact(tom, visitor):
    slug = slug_of(0)
    before = public(visitor, slug)["refer_to"]
    left = person_slug("Former member")
    answer = tom.put(f"{THEMES}/{slug}/contacts", json={"people": [left]})
    assert answer.status_code == 422 and detail(answer)["field"] == "people" and "left the group" in detail(answer)["message"]
    assert public(visitor, slug)["refer_to"] == before


def test_contacts_that_are_not_in_the_people_list_or_too_many_are_refused(tom):
    slug = slug_of(0)
    assert tom.put(f"{THEMES}/{slug}/contacts", json={"people": ["no-one-of-this-name"]}).status_code == 422
    with SessionLocal() as db:
        many = [p for p in db.scalars(select(Person.slug).where(Person.title != "Former member"))][:13]
    answer = tom.put(f"{THEMES}/{slug}/contacts", json={"people": many})
    assert answer.status_code == 422 and "at most 12" in detail(answer)["message"]


def test_the_same_contacts_again_are_not_recorded(tom):
    slug = slug_of(0)
    current = [p["slug"] for p in tom.get(f"{THEMES}/{slug}").json()["contacts"]]
    assert tom.put(f"{THEMES}/{slug}/contacts", json={"people": current}).status_code == 200
    assert audit_rows("theme.contacts") == []


# --- B1: the research areas, their topics and their involved people -------------------------------------------------------------------------------------------------


def test_a_new_area_goes_last_and_can_be_renamed(tom, visitor):
    slug = slug_of(0)
    before = [g["title"] for g in public(visitor, slug)["topic_groups"]]
    added = tom.post(f"{THEMES}/{slug}/areas", json={"title": "  A   new area "})
    assert added.status_code == 201 and added.json()["title"] == "A new area" and added.json()["topics"] == []
    assert [g["title"] for g in public(visitor, slug)["topic_groups"]] == before + ["A new area"]
    renamed = tom.patch(f"{AREAS}/{added.json()['id']}", json={"title": "Renamed area"})
    assert renamed.status_code == 200 and public(visitor, slug)["topic_groups"][-1]["title"] == "Renamed area"
    assert [row.action for row in audit_rows() if row.action.startswith("area.")] == ["area.add", "area.update"]


def test_an_area_moves_up_and_down_one_place_and_not_past_the_ends(tom, visitor):
    slug = slug_of(0)
    titles = [g["title"] for g in public(visitor, slug)["topic_groups"]]
    second = an_area(0, 1)["id"]
    tom.post(f"{AREAS}/{second}/move", json={"direction": "up"})
    assert [g["title"] for g in public(visitor, slug)["topic_groups"]] == [titles[1], titles[0]] + titles[2:]
    tom.post(f"{AREAS}/{second}/move", json={"direction": "up"})  # first already: nothing
    assert [g["title"] for g in public(visitor, slug)["topic_groups"]] == [titles[1], titles[0]] + titles[2:]
    tom.post(f"{AREAS}/{second}/move", json={"direction": "down"})
    assert [g["title"] for g in public(visitor, slug)["topic_groups"]] == titles
    assert tom.post(f"{AREAS}/{second}/move", json={"direction": "sideways"}).status_code == 422
    assert len(audit_rows("area.move")) == 2


@pytest.mark.parametrize("title", ["", "<b>x</b>", "x" * 201])
def test_an_area_title_that_is_not_acceptable_is_refused(tom, title):
    before = tom.get(f"{THEMES}/{slug_of(0)}").json()["areas"]
    assert tom.post(f"{THEMES}/{slug_of(0)}/areas", json={"title": title}).status_code == 422
    assert tom.patch(f"{AREAS}/{an_area(0)['id']}", json={"title": title}).status_code == 422
    assert tom.get(f"{THEMES}/{slug_of(0)}").json()["areas"] == before


def test_a_theme_has_at_most_twelve_areas(tom):
    slug = slug_of(0)
    have = len(tom.get(f"{THEMES}/{slug}").json()["areas"])
    for n in range(12 - have):
        assert tom.post(f"{THEMES}/{slug}/areas", json={"title": f"Area {n}"}).status_code == 201
    answer = tom.post(f"{THEMES}/{slug}/areas", json={"title": "One too many"})
    assert answer.status_code == 422 and "at most 12" in detail(answer)["message"]


def test_removing_an_area_shows_what_goes_and_needs_a_confirmation(tom, visitor):
    area = an_area(0)
    assert tom.get(f"{AREAS}/{area['id']}/delete-preview").json() == {"topics": area["topics"], "people": len(area["people"])}
    asked = tom.delete(f"{AREAS}/{area['id']}")
    assert asked.status_code == 409 and detail(asked)["code"] == "delete_needs_confirmation"
    assert detail(asked)["impact"] == {"topics": area["topics"], "people": len(area["people"])}
    assert area["title"] in [g["title"] for g in public(visitor, area["slug"])["topic_groups"]]
    assert tom.delete(f"{AREAS}/{area['id']}", params={"confirm": "true"}).status_code == 204
    assert area["title"] not in [g["title"] for g in public(visitor, area["slug"])["topic_groups"]]
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(Topic).where(Topic.group_id == area["id"])) == 0
        assert db.scalar(select(func.count()).select_from(TopicGroupPerson).where(TopicGroupPerson.group_id == area["id"])) == 0
        assert db.scalar(select(func.count()).select_from(Person)) > 0  # the people themselves stay in the People list
    (row,) = audit_rows("area.delete")
    assert row.before["title"] == area["title"] and row.before["people"] == area["people"]


def test_a_topic_can_be_added_renamed_moved_and_removed(tom, visitor):
    area = an_area(0)
    group = lambda: next(g for g in public(visitor, area["slug"])["topic_groups"] if g["title"] == area["title"])  # noqa: E731
    before = group()["topics"]
    added = tom.post(f"{AREAS}/{area['id']}/topics", json={"text": "  A new   topic "})
    assert added.status_code == 201 and added.json()["text"] == "A new topic"
    assert group()["topics"] == before + ["A new topic"]
    tom.patch(f"{TOPICS}/{added.json()['id']}", json={"text": "A topic, renamed"})
    assert group()["topics"][-1] == "A topic, renamed"
    tom.post(f"{TOPICS}/{added.json()['id']}/move", json={"direction": "up"})
    assert group()["topics"][-2] == "A topic, renamed"
    assert tom.delete(f"{TOPICS}/{added.json()['id']}").status_code == 204
    assert group()["topics"] == before
    assert [row.action for row in audit_rows() if row.action.startswith("topic.")] == ["topic.add", "topic.update", "topic.move", "topic.delete"]


@pytest.mark.parametrize("text", ["", "<i>x</i>", "x" * 301])
def test_a_topic_that_is_not_acceptable_is_refused(tom, text):
    area = an_area(0)
    assert tom.post(f"{AREAS}/{area['id']}/topics", json={"text": text}).status_code == 422
    assert tom.patch(f"{TOPICS}/{a_topic()}", json={"text": text}).status_code == 422


def test_an_area_has_at_most_fifteen_topics(tom):
    area = an_area(0)
    for n in range(15 - area["topics"]):
        assert tom.post(f"{AREAS}/{area['id']}/topics", json={"text": f"Topic {n}"}).status_code == 201
    assert tom.post(f"{AREAS}/{area['id']}/topics", json={"text": "One too many"}).status_code == 422


def test_the_involved_people_of_an_area_are_chosen_from_the_people_and_the_page_shows_them_by_rank(tom, visitor):
    area = an_area(0)
    new = person_slug("PhD Student", not_in=area["people"])
    answer = tom.put(f"{AREAS}/{area['id']}/people", json={"people": [new] + area["people"]})  # chosen first ...
    assert answer.status_code == 200 and [p["slug"] for p in answer.json()["people"]] == [new] + area["people"]
    shown = next(g for g in public(visitor, area["slug"])["topic_groups"] if g["title"] == area["title"])["people"]
    assert new in [p["slug"] for p in shown]
    ranks = ["Full Prof.", "Assoc. Prof.", "Asst. Prof.", "Research Fellow", "PhD Student", "Former member"]
    places = [ranks.index(p["title_short"]) for p in shown]
    assert places == sorted(places) and places[0] == 0  # ... the page still shows the professors first: by rank, whatever the order they were chosen in
    assert tom.put(f"{AREAS}/{area['id']}/people", json={"people": []}).json()["people"] == []
    assert len([row for row in audit_rows("area.people")]) == 2


def test_a_person_who_has_left_may_stay_among_the_involved_people(tom):
    area = an_area(0)
    left = person_slug("Former member")
    answer = tom.put(f"{AREAS}/{area['id']}/people", json={"people": area["people"] + [left]})
    assert answer.status_code == 200 and left in [p["slug"] for p in answer.json()["people"]]


def test_involved_people_that_are_not_in_the_people_list_or_too_many_are_refused(tom):
    area = an_area(0)
    before = tom.get(f"{THEMES}/{area['slug']}").json()["areas"]
    assert tom.put(f"{AREAS}/{area['id']}/people", json={"people": ["no-one-of-this-name"]}).status_code == 422
    with SessionLocal() as db:
        many = list(db.scalars(select(Person.slug)))[:25]
    answer = tom.put(f"{AREAS}/{area['id']}/people", json={"people": many})
    assert answer.status_code == 422 and "at most 24" in detail(answer)["message"]
    assert tom.get(f"{THEMES}/{area['slug']}").json()["areas"] == before


# --- B2: the highlight cards --------------------------------------------------------------------------------------------------------------------------------------------


def jpeg(**kw):
    return {"image": ("picture.jpg", image_bytes("JPEG", size=(800, 600), **kw), "image/jpeg")}


PAPER = {
    "title": "A New Paper On Something",
    "authors_full": "Ada Lovelace, Grace Hopper",
    "authors_short": "A. Lovelace, G. Hopper",
    "venue": "Journal of Testing",
    "tags": ["Testing", "Papers"],
    "text": "What the paper shows.",
    "url": "https://iris.polito.it/handle/11583/1",
    "image_alt": "A plot of the results",
}
PROJECT = {"title": "NEWP:", "subtitle": "a new project", "tags": ["Smart"], "text": "What the project does.", "url": "https://cordis.europa.eu/project/id/1", "image_alt": "The pilot line"}


def test_a_highlight_paper_can_be_replaced_with_a_new_picture_and_the_public_page_follows(tom, visitor):
    slug = slug_of(0)
    old = tom.get(f"{THEMES}/{slug}").json()["highlight_paper"]
    answer = tom.put(f"{THEMES}/{slug}/highlights/paper", data=PAPER, files=jpeg())
    assert answer.status_code == 200, answer.text
    body = answer.json()
    assert body["title"] == PAPER["title"] and body["tags"] == ["Testing", "Papers"] and body["image_alt"] == "A plot of the results"
    assert body["image_url"] and body["image_url"] != old["image_url"]
    assert (settings.media_dir / body["image_url"].split("/media/", 1)[1]).is_file()
    assert not (settings.media_dir / old["image_url"].split("/media/", 1)[1]).exists()  # the picture it replaced is deleted
    card = public(visitor, slug)["highlight_paper"]
    assert card["title"] == PAPER["title"] and card["image_alt"] == "A plot of the results" and card["authors_short"] == "A. Lovelace, G. Hopper"
    (row,) = audit_rows("highlight.save")
    assert row.entity_key == f"{slug}:paper" and row.before["title"] == old["title"] and row.after["image_alt"] == "A plot of the results"


def test_a_highlight_project_has_a_second_line_and_no_authors(tom, visitor):
    slug = slug_of(0)
    answer = tom.put(f"{THEMES}/{slug}/highlights/project", data=PROJECT)  # the picture it has stays
    assert answer.status_code == 200, answer.text
    card = public(visitor, slug)["highlight_project"]
    assert card["subtitle"] == "a new project" and card["authors_full"] is None and card["venue"] is None
    assert card["image_url"] and card["image_alt"] == "The pilot line"


def test_the_picture_stays_when_none_is_sent_and_goes_when_asked(tom, visitor):
    slug = slug_of(0)
    first = tom.put(f"{THEMES}/{slug}/highlights/paper", data=PAPER).json()["image_url"]
    assert first and first == public(visitor, slug)["highlight_paper"]["image_url"]
    removed = tom.put(f"{THEMES}/{slug}/highlights/paper", data={**PAPER, "remove_image": "true", "image_alt": ""})
    assert removed.status_code == 200 and removed.json()["image_url"] is None and removed.json()["image_alt"] is None
    assert not (settings.media_dir / first.split("/media/", 1)[1]).exists()


def test_a_picture_needs_its_text_alternative(tom):
    slug = slug_of(0)
    old = tom.get(f"{THEMES}/{slug}").json()["highlight_paper"]
    answer = tom.put(f"{THEMES}/{slug}/highlights/paper", data={**PAPER, "image_alt": "  "}, files=jpeg())
    assert answer.status_code == 422 and detail(answer)["field"] == "image_alt"
    answer = tom.put(f"{THEMES}/{slug}/highlights/paper", data={**PAPER, "image_alt": ""})  # the picture it has needs one too
    assert answer.status_code == 422 and detail(answer)["field"] == "image_alt"
    assert tom.get(f"{THEMES}/{slug}").json()["highlight_paper"] == old and audit_rows("highlight.save") == []


@pytest.mark.parametrize(
    "kind, over, field",
    [
        ("paper", {"title": ""}, "title"),
        ("paper", {"title": "<b>x</b>"}, "title"),
        ("paper", {"authors_full": ""}, "authors_full"),
        ("paper", {"authors_short": ""}, "authors_short"),
        ("paper", {"venue": ""}, "venue"),
        ("paper", {"text": ""}, "text"),
        ("paper", {"text": "x" * 1201}, "text"),
        ("paper", {"url": ""}, "url"),
        ("paper", {"url": "javascript:alert(1)"}, "url"),
        ("paper", {"tags": [f"tag {n}" for n in range(9)]}, "tags"),
        ("paper", {"tags": ["<b>"]}, "tags"),
        ("project", {"subtitle": ""}, "subtitle"),
    ],
)
def test_a_card_that_is_not_acceptable_is_refused_and_nothing_changes(tom, kind, over, field):
    slug = slug_of(0)
    base = PAPER if kind == "paper" else PROJECT
    before = tom.get(f"{THEMES}/{slug}").json()
    answer = tom.put(f"{THEMES}/{slug}/highlights/{kind}", data={**base, **over})
    assert answer.status_code == 422 and detail(answer)["field"] == field, answer.text
    assert tom.get(f"{THEMES}/{slug}").json() == before and audit_rows("highlight.save") == []


def test_a_file_that_is_not_a_usable_picture_is_refused(tom):
    slug = slug_of(0)
    for files, code in (
        ({"image": ("p.svg", b"<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>", "image/svg+xml")}, "image_invalid"),
        ({"image": ("p.jpg", b"not a picture", "image/jpeg")}, "image_invalid"),
        ({"image": ("p.jpg", b"x" * (5 * 1024 * 1024 + 10), "image/jpeg")}, "image_too_large"),
    ):
        answer = tom.put(f"{THEMES}/{slug}/highlights/paper", data=PAPER, files=files)
        assert answer.status_code in (413, 422) and detail(answer)["code"] == code


def test_a_card_that_is_not_a_paper_or_a_project_is_refused_and_a_missing_card_is_made(tom, visitor):
    slug = slug_of(0)
    assert tom.put(f"{THEMES}/{slug}/highlights/video", data=PAPER).status_code == 422
    with SessionLocal() as db:
        db.query(Highlight).filter(Highlight.kind == "paper", Highlight.theme_id == db.scalar(select(Theme.id).where(Theme.slug == slug))).delete()
        db.commit()
    assert public(visitor, slug)["highlight_paper"] is None
    assert tom.put(f"{THEMES}/{slug}/highlights/paper", data=PAPER, files=jpeg()).status_code == 200
    assert public(visitor, slug)["highlight_paper"]["title"] == PAPER["title"]


def test_the_same_card_again_is_not_recorded(tom):
    slug = slug_of(0)
    current = tom.get(f"{THEMES}/{slug}").json()["highlight_project"]
    data = {k: current[k] for k in ("title", "subtitle", "text", "url", "image_alt") if current[k] is not None}
    data["tags"] = current["tags"]
    data["image_alt"] = "The pilot line"
    assert tom.put(f"{THEMES}/{slug}/highlights/project", data=data).status_code == 200
    assert len(audit_rows("highlight.save")) == 1  # the alternative text was new, so this one is a change
    assert tom.put(f"{THEMES}/{slug}/highlights/project", data=data).status_code == 200
    assert len(audit_rows("highlight.save")) == 1  # and now it is the same
