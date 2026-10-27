"""The administrative staff keep the accounts (app/internal/accounts.py, app/services/accounts.py), and a user on a temporary password changes it before doing anything else."""
import re

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text

from app.db.session import SessionLocal, engine
from app.main import app
from app.models.audit import AuditLog
from app.models.user import User
from app.services import accounts as service
from app.services.users import get_by_email
from app.services.grants import Preset
from tests.admin_helpers import GOOD, browser_for, cleanup_admin_data, make_user

URL = "/api/admin/accounts"
TEMPORARY = re.compile(r"^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$")
NEW_PASSWORD = "a brand new passphrase for tom"


@pytest.fixture(autouse=True)
def clean():
    cleanup_admin_data()
    yield
    cleanup_admin_data()


@pytest.fixture
def db():
    with SessionLocal() as session:
        yield session


@pytest.fixture
def visitor(database):
    return TestClient(app)


@pytest.fixture
def staff():
    """The administrative staff, logged in."""
    make_user("ada@example.org", Preset.ADMINISTRATIVE)
    return browser_for("ada@example.org")


def login(email, password):
    client = TestClient(app)
    return client, client.post("/api/auth/login", json={"email": email, "password": password})


def make_account(staff, email="tom@example.org", name="Tom", preset="theme-owner"):
    answer = staff.post(URL, json={"email": email, "name": name, "preset": preset})
    assert answer.status_code == 201, answer.text
    return answer.json()


def detail(answer):
    return answer.json()["detail"]


def audit_rows(action=None):
    with SessionLocal() as db:
        statement = select(AuditLog).order_by(AuditLog.id)
        if action:
            statement = statement.where(AuditLog.action == action)
        return db.scalars(statement).all()


# --- who may ----------------------------------------------------------------------------------------------------------------------------------------------------------


def test_nobody_logged_in_may_use_the_account_routes(visitor):
    assert visitor.get(URL).status_code == 401
    assert visitor.post(URL, json={"email": "a@example.org", "name": "A"}).status_code == 401
    assert visitor.patch(f"{URL}/1", json={"name": "x"}).status_code == 401
    assert visitor.post(f"{URL}/1/reset-password").status_code == 401


@pytest.mark.parametrize("preset", [Preset.THEME_OWNER, Preset.PROJECTS_OWNER, None])
def test_only_those_with_the_accounts_grant_may_keep_accounts(staff, preset):
    make_user("other@example.org", preset)
    other = browser_for("other@example.org")
    target = make_account(staff)["account"]["id"]
    assert other.get(URL).status_code == 403
    assert other.post(URL, json={"email": "x@example.org", "name": "X"}).status_code == 403
    assert other.patch(f"{URL}/{target}", json={"name": "Hacked"}).status_code == 403
    assert other.post(f"{URL}/{target}/reset-password").status_code == 403
    assert get_user("tom@example.org").name == "Tom"


def get_user(email):
    with SessionLocal() as db:
        user = get_by_email(db, email)
        if user is not None:
            db.expunge(user)
        return user


def test_a_post_from_another_site_is_refused(staff):
    answer = staff.post(URL, json={"email": "tom@example.org", "name": "Tom"}, headers={"Origin": "https://evil.example"})
    assert answer.status_code == 403
    assert get_user("tom@example.org") is None


# --- making an account ------------------------------------------------------------------------------------------------------------------------------------------------


def test_the_staff_make_an_account_with_a_temporary_password_that_is_shown_once(staff):
    answer = staff.post(URL, json={"email": "Tom@Example.org", "name": "Tom Rossi", "preset": "theme-owner"})
    assert answer.status_code == 201 and answer.headers["cache-control"] == "no-store"
    body = answer.json()
    temporary = body["temporary_password"]
    assert TEMPORARY.match(temporary)
    account = body["account"]
    assert account["email"] == "tom@example.org" and account["preset"] == "theme-owner" and account["must_change_password"] is True and account["is_active"] is True
    assert account["grants"] == [{"area": "people_add", "theme": None}, {"area": "theme", "theme": None}]

    # only a hash of it is kept, and it is nowhere in the list or in the log
    assert temporary not in staff.get(URL).text
    assert temporary not in get_user("tom@example.org").password_hash
    (row,) = [r for r in audit_rows("user.create") if r.entity_key == "tom@example.org"]
    assert row.user_email == "ada@example.org" and row.after == {"name": "Tom Rossi", "preset": "theme-owner"}
    assert all(temporary not in str(r.after) and temporary not in str(r.before) for r in audit_rows())


def test_an_account_may_be_made_without_a_preset(staff):
    assert make_account(staff, preset=None)["account"]["grants"] == []


def test_a_bad_email_a_taken_one_and_an_unknown_preset_are_refused(staff):
    assert staff.post(URL, json={"email": "not-an-email", "name": "X"}).status_code == 422
    assert detail(staff.post(URL, json={"email": "not-an-email", "name": "X"}))["code"] == "invalid_account"
    assert staff.post(URL, json={"email": "tom@example.org", "name": "Tom", "preset": "owner"}).status_code == 422
    assert staff.post(URL, json={"email": "tom@example.org", "name": "  "}).status_code == 422
    make_account(staff)
    again = staff.post(URL, json={"email": "TOM@example.org", "name": "Other Tom"})
    assert again.status_code == 409 and detail(again)["code"] == "email_taken"


def test_the_list_shows_every_account_without_any_password(staff):
    make_account(staff, "tom@example.org", "Tom", "theme-owner")
    make_account(staff, "pia@example.org", "Pia", "projects-owner")
    answer = staff.get(URL)
    assert answer.status_code == 200 and answer.headers["cache-control"] == "no-store"
    accounts = {a["email"]: a for a in answer.json()}
    assert set(accounts) == {"ada@example.org", "tom@example.org", "pia@example.org"}
    assert accounts["ada@example.org"]["preset"] == "administrative" and accounts["pia@example.org"]["preset"] == "projects-owner"
    assert "argon2" not in answer.text and "password_hash" not in answer.text


# --- the temporary password -------------------------------------------------------------------------------------------------------------------------------------------


def test_a_user_on_a_temporary_password_may_do_nothing_but_change_it(staff):
    temporary = make_account(staff)["temporary_password"]
    tom, answer = login("tom@example.org", temporary)
    assert answer.status_code == 200 and answer.json()["must_change_password"] is True
    assert tom.get("/api/auth/me").json()["must_change_password"] is True  # he can ask who he is

    for blocked in (tom.get("/api/admin/people/enrico-macii"), tom.post("/api/admin/people", data={"name": "G H", "title": "PhD Student"}), tom.get(URL)):
        assert blocked.status_code == 403 and detail(blocked)["code"] == "password_change_required"

    wrong = tom.post("/api/auth/change-password", json={"current_password": "not the password at all", "new_password": NEW_PASSWORD})
    assert wrong.status_code == 403 and detail(wrong)["code"] == "current_password_wrong"
    weak = tom.post("/api/auth/change-password", json={"current_password": temporary, "new_password": "short"})
    assert weak.status_code == 422 and detail(weak)["code"] == "invalid_password"
    same = tom.post("/api/auth/change-password", json={"current_password": temporary, "new_password": temporary})
    assert same.status_code == 422 and "different" in detail(same)["message"]

    done = tom.post("/api/auth/change-password", json={"current_password": temporary, "new_password": NEW_PASSWORD})
    assert done.status_code == 200 and done.json()["must_change_password"] is False and done.headers["cache-control"] == "no-store"
    # the login goes on without a new login, and now the admin works for him
    assert tom.post("/api/admin/people", data={"name": "Grace Hopper", "title": "PhD Student"}).status_code == 201
    assert login("tom@example.org", temporary)[1].status_code == 401
    assert login("tom@example.org", NEW_PASSWORD)[1].status_code == 200
    (row,) = audit_rows("user.change_password")
    assert row.user_email == "tom@example.org" and NEW_PASSWORD not in str(row.after) + str(row.before)


def test_changing_the_password_ends_the_other_logins_but_not_this_one():
    make_user("tom@example.org", Preset.THEME_OWNER)
    here, other = browser_for("tom@example.org"), browser_for("tom@example.org")
    assert other.get("/api/auth/me").status_code == 200
    assert here.post("/api/auth/change-password", json={"current_password": GOOD, "new_password": NEW_PASSWORD}).status_code == 200
    assert here.get("/api/auth/me").status_code == 200
    assert other.get("/api/auth/me").status_code == 401


def test_wrong_current_passwords_are_counted_like_wrong_logins_and_lock(staff):
    make_user("tom@example.org", Preset.THEME_OWNER)
    tom = browser_for("tom@example.org")
    for _ in range(5):
        assert tom.post("/api/auth/change-password", json={"current_password": "wrong password again", "new_password": NEW_PASSWORD}).status_code == 403
    locked = tom.post("/api/auth/change-password", json={"current_password": GOOD, "new_password": NEW_PASSWORD})
    assert locked.status_code == 429 and "Retry-After" in locked.headers
    assert get_user("tom@example.org").must_change_password is False  # nothing changed


def test_changing_the_password_needs_a_login_and_passes_the_cross_site_check(visitor):
    assert visitor.post("/api/auth/change-password", json={"current_password": GOOD, "new_password": NEW_PASSWORD}).status_code == 401
    make_user("tom@example.org", Preset.THEME_OWNER)
    tom = browser_for("tom@example.org")
    answer = tom.post("/api/auth/change-password", json={"current_password": GOOD, "new_password": NEW_PASSWORD}, headers={"Origin": "https://evil.example"})
    assert answer.status_code == 403


# --- changing an account ----------------------------------------------------------------------------------------------------------------------------------------------


def test_a_name_and_the_grants_are_changed_and_recorded(staff):
    account = make_account(staff)["account"]
    renamed = staff.patch(f"{URL}/{account['id']}", json={"name": "Tom Rossi"})
    assert renamed.status_code == 200 and renamed.json()["name"] == "Tom Rossi" and renamed.json()["preset"] == "theme-owner"
    changed = staff.patch(f"{URL}/{account['id']}", json={"preset": "projects-owner"})
    assert changed.json()["preset"] == "projects-owner" and changed.json()["grants"] == [{"area": "projects", "theme": None}]
    stripped = staff.patch(f"{URL}/{account['id']}", json={"preset": None})
    assert stripped.json()["preset"] is None and stripped.json()["grants"] == []

    rows = audit_rows("user.update")
    assert [r.after["preset"] for r in rows] == ["theme-owner", "projects-owner", None]
    assert rows[1].before["grants"] == ["people_add", "theme"] and rows[1].after["grants"] == ["projects"]


def test_an_account_that_is_switched_off_cannot_log_in_and_its_login_ends(staff):
    account = make_account(staff)
    tom, _ = login("tom@example.org", account["temporary_password"])
    assert tom.get("/api/auth/me").status_code == 200
    off = staff.patch(f"{URL}/{account['account']['id']}", json={"is_active": False})
    assert off.status_code == 200 and off.json()["is_active"] is False
    assert tom.get("/api/auth/me").status_code == 401
    assert login("tom@example.org", account["temporary_password"])[1].status_code == 401
    assert staff.patch(f"{URL}/{account['account']['id']}", json={"is_active": True}).json()["is_active"] is True
    assert login("tom@example.org", account["temporary_password"])[1].status_code == 200


def test_the_staff_cannot_switch_off_change_or_reset_their_own_account(staff):
    mine = next(a for a in staff.get(URL).json() if a["email"] == "ada@example.org")["id"]
    for answer in (
        staff.patch(f"{URL}/{mine}", json={"is_active": False}),
        staff.patch(f"{URL}/{mine}", json={"preset": "projects-owner"}),
        staff.post(f"{URL}/{mine}/reset-password"),
    ):
        assert answer.status_code == 409 and detail(answer)["code"] == "not_on_yourself"
    assert get_user("ada@example.org").is_active is True
    assert staff.patch(f"{URL}/{mine}", json={"name": "Ada Lovelace"}).status_code == 200  # a name is not a risk


def test_the_last_account_that_can_manage_accounts_is_never_switched_off_or_downgraded(db):
    make_user("ada@example.org", Preset.ADMINISTRATIVE)
    make_user("bea@example.org", Preset.ADMINISTRATIVE)
    ada, bea = get_by_email(db, "ada@example.org"), get_by_email(db, "bea@example.org")
    # Ada is switched off in the database (the developer can do that), so Bea is the only one left who may manage accounts
    db.execute(text("UPDATE users SET is_active = false WHERE email = 'ada@example.org'"))
    db.commit()
    db.refresh(ada)
    for changes in ({"is_active": False}, {"preset": Preset.THEME_OWNER}, {"preset": None}):
        with pytest.raises(service.AccountError) as refused:
            service.update_account(db, ada, bea.id, changes)
        assert refused.value.code == "last_account_manager", changes
    assert service.update_account(db, ada, bea.id, {"preset": Preset.ADMINISTRATIVE}).is_active  # the same grants: nothing lost


def test_unknown_accounts_are_not_found(staff):
    assert staff.patch(f"{URL}/999999", json={"name": "x"}).status_code == 404
    assert staff.post(f"{URL}/999999/reset-password").status_code == 404


# --- a new password for someone else ----------------------------------------------------------------------------------------------------------------------------------


def test_a_reset_gives_a_new_temporary_password_ends_the_logins_and_lifts_a_lock(staff):
    make_user("tom@example.org", Preset.THEME_OWNER)
    tom = browser_for("tom@example.org")
    for _ in range(5):
        login("tom@example.org", "wrong password again")
    assert login("tom@example.org", GOOD)[1].status_code == 429  # locked

    target = next(a for a in staff.get(URL).json() if a["email"] == "tom@example.org")["id"]
    answer = staff.post(f"{URL}/{target}/reset-password")
    assert answer.status_code == 200 and answer.headers["cache-control"] == "no-store"
    temporary = answer.json()["temporary_password"]
    assert TEMPORARY.match(temporary) and answer.json()["account"]["must_change_password"] is True

    assert tom.get("/api/auth/me").status_code == 401  # his old login ended
    assert login("tom@example.org", GOOD)[1].status_code == 401  # and his old password is gone
    again, entered = login("tom@example.org", temporary)  # the lock is lifted
    assert entered.status_code == 200 and entered.json()["must_change_password"] is True
    (row,) = audit_rows("user.reset_password")
    assert row.user_email == "ada@example.org" and row.entity_key == "tom@example.org" and temporary not in str(row.after)


def test_the_database_keeps_nothing_but_a_hash_of_a_temporary_password(staff):
    temporary = make_account(staff)["temporary_password"]
    with engine.connect() as connection:
        dump = " ".join(str(value) for row in connection.execute(text("SELECT * FROM users")) for value in row)
        logs = " ".join(str(row) for row in connection.execute(text("SELECT * FROM audit_log")))
    assert temporary not in dump and temporary not in logs
