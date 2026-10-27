"""Who may do what: the grants, their presets, and the rows that record them (app/services/grants.py)."""
import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.db.session import SessionLocal
from app.models.audit import AuditLog
from app.models.grant import Area, UserGrant
from app.models.theme import Theme
from app.models.user import User
from app.services.grants import GrantError, NotAllowed, Preset, apply_preset, grant, has_grant, require, revoke
from app.services.users import create_user, get_by_email
from tests.admin_helpers import GOOD, browser_for, cleanup_admin_data, make_user


@pytest.fixture(autouse=True)
def clean():
    cleanup_admin_data()
    yield
    cleanup_admin_data()


@pytest.fixture
def db():
    with SessionLocal() as session:
        yield session


def theme_id(db, slug):
    return db.scalar(select(Theme.id).where(Theme.slug == slug))


def areas(user):
    return sorted((g.area, g.theme.slug if g.theme else None) for g in user.grants)


# --- the presets ------------------------------------------------------------------------------------------------------------------------------------------------------


def test_the_administrative_staff_may_add_change_and_delete_people_keep_the_site_pages_and_manage_accounts(db):
    user = create_user(db, "ada@example.org", "Ada", GOOD, Preset.ADMINISTRATIVE)
    assert areas(user) == [("accounts", None), ("people_add", None), ("people_delete", None), ("people_edit", None), ("site", None)]


def test_the_theme_owner_may_add_people_and_keep_every_theme(db):
    user = create_user(db, "tom@example.org", "Tom", GOOD, Preset.THEME_OWNER)
    assert areas(user) == [("people_add", None), ("theme", None)]
    # "every theme" covers each of them, the ones added later included
    assert all(has_grant(db, user, Area.THEME, theme_id(db, slug)) for slug in ("vlsi-cad", "bioinformatics", "smart-city", "industry-4-0"))


def test_the_projects_owner_may_keep_the_funded_projects_and_nothing_else(db):
    user = create_user(db, "pia@example.org", "Pia", GOOD, Preset.PROJECTS_OWNER)
    assert areas(user) == [("projects", None)]
    for area in (Area.PEOPLE_ADD, Area.PEOPLE_EDIT, Area.PEOPLE_DELETE, Area.SITE, Area.THEME, Area.ACCOUNTS):
        assert not has_grant(db, user, area), area


def test_an_account_without_a_preset_may_do_nothing(db):
    user = create_user(db, "none@example.org", "None", GOOD)
    assert not any(has_grant(db, user, area) for area in Area)


# --- the grants -------------------------------------------------------------------------------------------------------------------------------------------------------


def test_a_grant_for_one_theme_covers_that_theme_only(db):
    user = create_user(db, "tom@example.org", "Tom", GOOD)
    vlsi, bio = theme_id(db, "vlsi-cad"), theme_id(db, "bioinformatics")
    grant(db, user, Area.THEME, vlsi)
    db.commit()
    assert has_grant(db, user, Area.THEME, vlsi)
    assert not has_grant(db, user, Area.THEME, bio)
    assert has_grant(db, user, Area.THEME)  # some theme at all


def test_a_grant_can_be_given_twice_and_is_kept_once(db):
    user = create_user(db, "tom@example.org", "Tom", GOOD)
    assert grant(db, user, Area.PROJECTS) is True
    db.commit()
    assert grant(db, user, Area.PROJECTS) is False
    assert grant(db, user, Area.THEME) is True and grant(db, user, Area.THEME) is False
    db.commit()
    assert areas(get_by_email(db, "tom@example.org")) == [("projects", None), ("theme", None)]


def test_only_a_theme_grant_is_about_a_theme_and_the_theme_must_exist(db):
    user = create_user(db, "tom@example.org", "Tom", GOOD)
    with pytest.raises(GrantError):
        grant(db, user, Area.SITE, theme_id(db, "vlsi-cad"))
    with pytest.raises(GrantError):
        grant(db, user, Area.THEME, 999999)


def test_a_grant_is_taken_away(db):
    user = create_user(db, "tom@example.org", "Tom", GOOD, Preset.THEME_OWNER)
    assert revoke(db, user, Area.THEME) is True
    db.commit()
    assert revoke(db, user, Area.THEME) is False
    assert areas(get_by_email(db, "tom@example.org")) == [("people_add", None)]


def test_require_says_no_to_a_user_without_the_grant(db):
    user = create_user(db, "pia@example.org", "Pia", GOOD, Preset.PROJECTS_OWNER)
    require(db, user, Area.PROJECTS)
    with pytest.raises(NotAllowed):
        require(db, user, Area.ACCOUNTS)


def test_the_database_itself_refuses_the_same_grant_twice_even_for_every_theme(db):
    user = create_user(db, "tom@example.org", "Tom", GOOD)
    db.add(UserGrant(user_id=user.id, area="theme", theme_id=None))
    db.commit()
    db.add(UserGrant(user_id=user.id, area="theme", theme_id=None))
    with pytest.raises(IntegrityError):
        db.commit()


def test_the_database_itself_refuses_a_theme_on_a_grant_that_is_not_about_one(db):
    user = create_user(db, "tom@example.org", "Tom", GOOD)
    db.add(UserGrant(user_id=user.id, area="site", theme_id=theme_id(db, "vlsi-cad")))
    with pytest.raises(IntegrityError):
        db.commit()


def test_the_grants_go_with_the_account(db):
    user = create_user(db, "tom@example.org", "Tom", GOOD, Preset.ADMINISTRATIVE)
    db.delete(db.get(User, user.id))
    db.commit()
    assert db.scalars(select(UserGrant)).all() == []


# --- what is recorded -------------------------------------------------------------------------------------------------------------------------------------------------


def test_making_an_account_and_giving_grants_are_recorded(db):
    admin = create_user(db, "ada@example.org", "Ada", GOOD, Preset.ADMINISTRATIVE)
    user = create_user(db, "tom@example.org", "Tom", GOOD, Preset.THEME_OWNER, actor=admin)
    revoke(db, user, Area.PEOPLE_ADD, actor=admin)
    db.commit()
    rows = db.scalars(select(AuditLog).where(AuditLog.entity_key == "tom@example.org").order_by(AuditLog.id)).all()
    assert [r.action for r in rows] == ["grant.add", "grant.add", "user.create", "grant.remove"] or sorted(r.action for r in rows) == ["grant.add", "grant.add", "grant.remove", "user.create"]
    assert all(r.user_email == "ada@example.org" for r in rows)
    created = next(r for r in rows if r.action == "user.create")
    assert created.after == {"name": "Tom", "preset": "theme-owner"}
    assert "password" not in str(created.after).lower() and "argon2" not in str(created.after).lower()


# --- through the API --------------------------------------------------------------------------------------------------------------------------------------------------


def test_the_logged_in_user_is_told_what_they_may_do():
    make_user("tom@example.org", Preset.THEME_OWNER)
    answer = browser_for("tom@example.org").get("/api/auth/me")
    assert answer.status_code == 200
    assert answer.json()["grants"] == [{"area": "people_add", "theme": None}, {"area": "theme", "theme": None}]
