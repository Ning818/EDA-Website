import pytest
from sqlalchemy import delete

from app.db.session import SessionLocal
from app.models.site import SiteContact
from app.schemas.site import dialable
from tests.conftest import seed_everything
from tests.seed_data import SITE


def test_the_footer_numbers_are_what_the_seed_says(client):
    answer = client.get("/api/site")
    assert answer.status_code == 200
    site = answer.json()
    assert (site["phone"], site["fax"]) == (SITE["phone"], SITE["fax"])
    assert set(site) == {"phone", "phone_dial", "fax"}


def test_the_phone_comes_with_the_number_that_dials(client):
    assert client.get("/api/site").json()["phone_dial"] == "+390110907042"


@pytest.mark.parametrize(
    ("shown", "dial"),
    [
        ("+39 011 090 7042", "+390110907042"),
        ("011 090 7042", "0110907042"),
        ("+39 (011) 090-7042", "+390110907042"),
        ("  +44 20 7946 0958 ", "+442079460958"),
        ("", None),
        (None, None),
        ("no number", None),
    ],
)
def test_a_number_is_made_dialable(shown, dial):
    assert dialable(shown) == dial


def test_an_empty_number_stays_empty(client):
    """The footer leaves a line out when its number is empty; the API says so with a null, not an empty string."""
    with SessionLocal() as db:
        db.get(SiteContact, 1).fax = None
        db.commit()
    try:
        assert client.get("/api/site").json()["fax"] is None
    finally:
        seed_everything()


def test_without_contact_details_the_answer_says_so_and_the_site_can_carry_on(client):
    with SessionLocal() as db:
        db.execute(delete(SiteContact))
        db.commit()
    try:
        answer = client.get("/api/site")
        assert answer.status_code == 404
        assert answer.json() == {"detail": "The site's contact details are not set"}
    finally:
        seed_everything()
    assert client.get("/api/site").status_code == 200
