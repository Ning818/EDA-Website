"""The command line for the accounts (app/manage.py)."""
import pytest
from sqlalchemy import text

from app.db.session import SessionLocal, engine
from app.manage import run
from app.services.users import InvalidLogin, authenticate, get_by_email

GOOD = "correct horse battery staple"


@pytest.fixture(autouse=True)
def no_accounts():
    with engine.begin() as connection:
        connection.execute(text("DELETE FROM login_attempts"))
        connection.execute(text("DELETE FROM users"))
    yield


def typed(*answers):
    """A stand-in for the terminal's hidden password prompt: gives the answers in turn."""
    remaining = list(answers)
    return lambda _prompt: remaining.pop(0)


def lines():
    output = []
    return output, output.append


def test_an_account_is_made_from_the_command_line():
    output, out = lines()
    assert run(["create-user", "--email", "Ada@Example.org", "--name", "Ada Lovelace", "--role", "admin"], prompt=typed(GOOD, GOOD), out=out) == 0
    assert output == ["Made the admin account ada@example.org."]
    with SessionLocal() as db:
        assert authenticate(db, "ada@example.org", GOOD).role == "admin"


def test_the_default_role_is_editor():
    run(["create-user", "--email", "ed@example.org", "--name", "Ed"], prompt=typed(GOOD, GOOD), out=lines()[1])
    with SessionLocal() as db:
        assert get_by_email(db, "ed@example.org").role == "editor"


def test_two_different_passwords_make_no_account(capsys):
    assert run(["create-user", "--email", "ada@example.org", "--name", "Ada"], prompt=typed(GOOD, GOOD + "x"), out=lines()[1]) == 1
    assert "not the same" in capsys.readouterr().err
    with SessionLocal() as db:
        assert get_by_email(db, "ada@example.org") is None


def test_a_weak_password_makes_no_account(capsys):
    assert run(["create-user", "--email", "ada@example.org", "--name", "Ada"], prompt=typed("short", "short"), out=lines()[1]) == 1
    assert "at least 12" in capsys.readouterr().err


def test_a_role_that_does_not_exist_is_refused():
    with pytest.raises(SystemExit):
        run(["create-user", "--email", "ada@example.org", "--name", "Ada", "--role", "owner"], prompt=typed(GOOD, GOOD), out=lines()[1])


def test_a_new_password_from_the_command_line():
    run(["create-user", "--email", "ada@example.org", "--name", "Ada"], prompt=typed(GOOD, GOOD), out=lines()[1])
    output, out = lines()
    assert run(["set-password", "--email", "ada@example.org"], prompt=typed("another very long passphrase", "another very long passphrase"), out=out) == 0
    with SessionLocal() as db:
        with pytest.raises(InvalidLogin):
            authenticate(db, "ada@example.org", GOOD)
        authenticate(db, "ada@example.org", "another very long passphrase")


def test_an_account_is_switched_off_and_on():
    run(["create-user", "--email", "ada@example.org", "--name", "Ada"], prompt=typed(GOOD, GOOD), out=lines()[1])
    output, out = lines()
    assert run(["deactivate", "--email", "ada@example.org"], out=out) == 0
    with SessionLocal() as db:
        with pytest.raises(InvalidLogin):
            authenticate(db, "ada@example.org", GOOD)
    assert run(["activate", "--email", "ada@example.org"], out=out) == 0
    with SessionLocal() as db:
        assert authenticate(db, "ada@example.org", GOOD).is_active
    assert output == ["ada@example.org is switched off.", "ada@example.org is active."]


def test_an_account_that_does_not_exist_is_said_so(capsys):
    assert run(["deactivate", "--email", "nobody@example.org"], out=lines()[1]) == 1
    assert "no account" in capsys.readouterr().err


def test_the_accounts_are_listed_without_their_passwords():
    run(["create-user", "--email", "ada@example.org", "--name", "Ada", "--role", "admin"], prompt=typed(GOOD, GOOD), out=lines()[1])
    output, out = lines()
    assert run(["list-users"], out=out) == 0
    assert len(output) == 1 and "ada@example.org" in output[0] and "admin" in output[0] and "active" in output[0]
    assert "argon2" not in output[0] and GOOD not in output[0]
