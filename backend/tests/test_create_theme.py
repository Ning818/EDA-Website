"""A new theme, made by the developer from the command line (app/services/themes.py create_theme, `python -m app.manage create-theme`)."""
import pytest
from sqlalchemy import select, text

from app.db.session import SessionLocal, engine
from app.manage import run
from app.models.audit import AuditLog
from app.models.theme import Theme
from app.services.grants import Preset
from tests.admin_helpers import browser_for, cleanup_admin_data, make_user
from tests.conftest import seed_everything

SEED_SLUGS = ["vlsi-cad", "bioinformatics", "smart-city", "industry-4-0"]


@pytest.fixture(autouse=True)
def clean():
    cleanup_admin_data()
    yield
    with engine.begin() as connection:
        connection.execute(text("DELETE FROM themes WHERE slug <> ALL(:slugs)"), {"slugs": SEED_SLUGS})
        connection.execute(text("UPDATE themes SET on_site = true"))  # some tests take the seed themes off the site
    cleanup_admin_data()
    seed_everything()


@pytest.fixture
def db():
    with SessionLocal() as session:
        yield session


def make(*args):
    lines = []
    code = run(["create-theme", *args], out=lines.append)
    return code, lines


def order(db):
    return [t.slug for t in db.scalars(select(Theme).order_by(Theme.position, Theme.id))]


def test_a_theme_is_made_with_its_name_and_goes_last(db):
    code, lines = make("--slug", "smart-grid", "--name", "Smart Grid")
    assert code == 0 and "Made the theme Smart Grid (smart-grid) at position 4" in lines[0]
    assert "frontend/src/themes.js" in lines[0]
    theme = db.scalar(select(Theme).where(Theme.slug == "smart-grid"))
    assert theme.name == "Smart Grid" and theme.position == 4 and theme.short_name is None and theme.home_summary is None
    assert "still to be written" in theme.intro and "still to be written" in theme.funded_blurb  # neither may be empty
    assert order(db) == [*SEED_SLUGS, "smart-grid"]
    assert theme.highlights == [] and theme.groups == [] and theme.projects == [] and theme.contacts == []


def test_all_the_words_may_be_given(db):
    code, _ = make(
        "--slug", "smart-grid", "--name", "Smart Grid and Energy", "--short-name", "Smart Grid", "--home-summary", "  The group works  on the grid. ", "--intro", "The grid page.", "--funded-blurb", "Projects on the grid."
    )
    assert code == 0
    theme = db.scalar(select(Theme).where(Theme.slug == "smart-grid"))
    assert (theme.name, theme.short_name, theme.home_summary, theme.intro, theme.funded_blurb) == ("Smart Grid and Energy", "Smart Grid", "The group works on the grid.", "The grid page.", "Projects on the grid.")


def test_making_it_is_written_in_the_activity_log_as_the_command_line(db):
    make("--slug", "smart-grid", "--name", "Smart Grid")
    entry = db.scalar(select(AuditLog).where(AuditLog.action == "theme.create"))
    assert entry.user_email == "(command line)" and entry.user_id is None and entry.entity_key == "smart-grid"
    assert entry.after["name"] == "Smart Grid" and entry.after["position"] == 4


def test_a_position_puts_it_there_and_moves_the_others_down(db):
    make("--slug", "smart-grid", "--name", "Smart Grid", "--position", "1")
    assert order(db) == ["vlsi-cad", "smart-grid", "bioinformatics", "smart-city", "industry-4-0"]
    assert sorted(t.position for t in db.scalars(select(Theme))) == [0, 1, 2, 3, 4]
    make("--slug", "first-one", "--name", "First One", "--position", "0")
    assert order(db)[0] == "first-one"


def test_a_position_past_the_end_means_last(db):
    make("--slug", "smart-grid", "--name", "Smart Grid", "--position", "40")
    assert order(db)[-1] == "smart-grid" and db.scalar(select(Theme.position).where(Theme.slug == "smart-grid")) == 4


@pytest.mark.parametrize("slug", ["Smart-Grid", "smart grid", "-grid", "grid-", "smart--grid", "smart_grid", "gr!d", "x" * 51, "ünï", ""])
def test_a_slug_that_is_not_an_address_is_refused(db, capsys, slug):
    code, lines = make(f"--slug={slug}", "--name", "Smart Grid")  # "=" so that a slug starting with a hyphen is read as a value
    assert code == 1 and not lines
    assert "slug" in capsys.readouterr().err.lower()
    assert order(db) == SEED_SLUGS


def test_a_slug_that_is_taken_is_refused(db, capsys):
    code, _ = make("--slug", "smart-city", "--name", "Another Smart City")
    assert code == 1 and "smart-city already" in capsys.readouterr().err
    assert db.scalar(select(Theme.name).where(Theme.slug == "smart-city")) == "Smart City"


@pytest.mark.parametrize(
    "args, word",
    [
        (["--name", "   "], "name"),
        (["--name", "N" * 101], "name"),
        (["--name", "A <b>name</b>"], "name"),
        (["--name", "Ok", "--short-name", "S" * 51], "short"),
        (["--name", "Ok", "--intro", "I" * 1001], "introduction"),
        (["--name", "Ok", "--funded-blurb", "F" * 601], "funded"),
        (["--name", "Ok", "--home-summary", "H" * 1001], "home"),
        (["--name", "Ok", "--position", "-1"], "position"),
    ],
)
def test_words_that_do_not_fit_are_refused_and_nothing_is_made(db, capsys, args, word):
    code, _ = make("--slug", "smart-grid", *args)
    assert code == 1 and word in capsys.readouterr().err.lower()
    assert order(db) == SEED_SLUGS
    assert db.scalar(select(AuditLog.id).where(AuditLog.action == "theme.create")) is None


def test_the_owners_of_every_theme_can_write_the_new_one_in_the_admin(db):
    make("--slug", "smart-grid", "--name", "Smart Grid")
    make_user("tom@example.org", Preset.THEME_OWNER)
    tom = browser_for("tom@example.org")
    assert "smart-grid" in [t["slug"] for t in tom.get("/api/admin/themes").json()]
    shown = tom.get("/api/admin/themes/smart-grid")
    assert shown.status_code == 200 and shown.json()["name"] == "Smart Grid"
    changed = tom.patch("/api/admin/themes/smart-grid", json={"intro": "The real introduction of the theme."})
    assert changed.status_code == 200 and changed.json()["intro"] == "The real introduction of the theme."
    assert tom.post("/api/admin/themes/smart-grid/areas", json={"title": "Grid balancing"}).status_code == 201


def test_someone_with_the_grant_of_one_other_theme_cannot_write_it(db):
    from app.services.grants import grant
    from app.services.users import get_by_email

    make("--slug", "smart-grid", "--name", "Smart Grid")
    make_user("pia@example.org")
    pia = get_by_email(db, "pia@example.org")
    grant(db, pia, "theme", db.scalar(select(Theme.id).where(Theme.slug == "smart-city")))
    db.commit()
    assert browser_for("pia@example.org").get("/api/admin/themes/smart-grid").status_code == 403


def live(*args):
    lines = []
    code = run(["set-theme-live", *args], out=lines.append)
    return code, lines


def test_a_theme_that_is_not_on_the_site_is_unknown_to_the_public_api_and_in_the_admin_marked_so(db):
    from fastapi.testclient import TestClient

    from app.main import app

    make("--slug", "smart-grid", "--name", "Smart Grid")
    visitor = TestClient(app)
    assert "smart-grid" not in [t["slug"] for t in visitor.get("/api/themes").json()]
    assert visitor.get("/api/themes/smart-grid").status_code == 404  # what the staff write in it is not for visitors to read
    make_user("tom@example.org", Preset.THEME_OWNER)
    tom = browser_for("tom@example.org")
    listed = {t["slug"]: t["on_site"] for t in tom.get("/api/admin/themes").json()}
    assert listed == {**{slug: True for slug in SEED_SLUGS}, "smart-grid": False}
    assert tom.get("/api/admin/themes/smart-grid").json()["on_site"] is False
    assert tom.get("/api/admin/themes/smart-city").json()["on_site"] is True


def test_putting_it_on_the_site_shows_it_to_visitors_and_writes_a_row(db):
    from fastapi.testclient import TestClient

    from app.main import app

    make("--slug", "smart-grid", "--name", "Smart Grid")
    code, lines = live("--slug", "smart-grid")
    assert code == 0 and "Smart Grid (smart-grid) is on the website" in lines[0]
    visitor = TestClient(app)
    assert [t["slug"] for t in visitor.get("/api/themes").json()][-1] == "smart-grid"
    assert visitor.get("/api/themes/smart-grid").status_code == 200
    entry = db.scalar(select(AuditLog).where(AuditLog.action == "theme.on_site"))
    assert entry.user_email == "(command line)" and entry.before == {"on_site": False} and entry.after == {"on_site": True}


def test_it_can_be_taken_off_the_site_again_and_what_is_written_stays(db):
    from fastapi.testclient import TestClient

    from app.main import app

    make("--slug", "smart-grid", "--name", "Smart Grid", "--intro", "Written already.")
    live("--slug", "smart-grid")
    code, lines = live("--slug", "smart-grid", "--off")
    assert code == 0 and "is off the website" in lines[0]
    assert TestClient(app).get("/api/themes/smart-grid").status_code == 404
    assert db.scalar(select(Theme.intro).where(Theme.slug == "smart-grid")) == "Written already."
    assert db.scalar(select(AuditLog.action).where(AuditLog.action == "theme.off_site")) == "theme.off_site"


def test_saying_what_is_so_already_changes_nothing_and_writes_no_row(db):
    live("--slug", "smart-city")  # it is on the site already
    make("--slug", "smart-grid", "--name", "Smart Grid")
    live("--slug", "smart-grid", "--off")  # and this one is off already
    assert db.scalar(select(AuditLog.id).where(AuditLog.action.in_(["theme.on_site", "theme.off_site"]))) is None


def test_the_last_theme_on_the_site_cannot_be_taken_off(db, capsys):
    make("--slug", "smart-grid", "--name", "Smart Grid")  # not on the site, so it does not count
    for slug in SEED_SLUGS[:-1]:
        assert live("--slug", slug, "--off")[0] == 0
    code, _ = live("--slug", SEED_SLUGS[-1], "--off")
    assert code == 1 and "at least one theme" in capsys.readouterr().err
    assert db.scalar(select(Theme.on_site).where(Theme.slug == SEED_SLUGS[-1])) is True


def test_a_theme_that_does_not_exist_cannot_be_put_on_the_site(capsys):
    code, _ = live("--slug", "nothing-here")
    assert code == 1 and "no theme with that slug" in capsys.readouterr().err
