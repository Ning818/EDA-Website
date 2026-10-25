import pytest

from tests.seed_data import GROUP_OF, GROUPS, PEOPLE, PEOPLE_BY_SLUG, people_in_page_order

SHORT_TITLES = {
    "Full Professor": "Full Prof.",
    "Associate Professor": "Assoc. Prof.",
    "Assistant Professor": "Asst. Prof.",
    "Research Fellow": "Research Fellow",
    "PhD Student": "PhD Student",
    "Former member": "Former member",
}


def test_everybody_comes_in_the_order_of_the_people_page(client):
    answer = client.get("/api/people")
    assert answer.status_code == 200
    assert [p["slug"] for p in answer.json()] == [p["slug"] for p in people_in_page_order()]


@pytest.mark.parametrize("group", GROUPS)
def test_a_group_has_only_its_people_in_order(client, group):
    answer = client.get("/api/people", params={"group": group})
    assert answer.status_code == 200
    people = answer.json()
    assert [p["slug"] for p in people] == [p["slug"] for p in people_in_page_order(group)]
    assert {p["group"] for p in people} == {group}


def test_the_research_fellows_come_before_the_phd_students(client):
    titles = [p["title"] for p in client.get("/api/people", params={"group": "phd-students"}).json()]
    assert titles == sorted(titles, key=["Research Fellow", "PhD Student"].index)


def test_an_unknown_group_is_refused(client):
    assert client.get("/api/people", params={"group": "nobody"}).status_code == 422


def test_one_person(client):
    person = client.get("/api/people/enrico-macii").json()
    assert person["name"] == "Enrico Macii"
    assert person["title"] == "Full Professor"
    assert person["title_short"] == "Full Prof."
    assert person["group"] == "professors"
    assert person["photo_url"] == "/media/people/enrico-macii.png"


def test_an_unknown_person_is_not_found(client):
    answer = client.get("/api/people/nobody")
    assert answer.status_code == 404
    assert answer.json() == {"detail": "Person not found"}


def test_each_person_says_what_the_seed_says(client):
    for person in client.get("/api/people").json():
        seeded = PEOPLE_BY_SLUG[person["slug"]]
        assert person["name"] == seeded["name"]
        assert person["title"] == seeded["title"]
        assert person["group"] == GROUP_OF[seeded["title"]]
        assert person["title_short"] == SHORT_TITLES[seeded["title"]]
        # only the links the person has
        assert person["links"] == {key: url for key, url in seeded["links"].items() if url}


def test_a_card_name_is_the_name_unless_a_shorter_one_is_given(client):
    people = {p["slug"]: p for p in client.get("/api/people").json()}
    assert people["roberto-giorgio-rizzo"]["card_name"] == "Roberto G. Rizzo"
    assert people["roberto-giorgio-rizzo"]["name"] == "Roberto Giorgio Rizzo"
    assert all(p["card_name"] == p["name"] for slug, p in people.items() if slug != "roberto-giorgio-rizzo")


def test_the_page_a_card_links_to_is_the_staff_page_else_the_iris_profile(client):
    for person in client.get("/api/people").json():
        links = person["links"]
        if "polito" in links:
            assert (person["page_url"], person["page_kind"]) == (links["polito"], "staff")
        elif "iris" in links:
            assert (person["page_url"], person["page_kind"]) == (links["iris"], "iris")
        else:
            assert (person["page_url"], person["page_kind"]) == (None, None)


def test_every_photo_is_served(client):
    people = client.get("/api/people").json()
    assert len(people) == len(PEOPLE)
    for person in people:
        assert person["photo_url"], person["slug"]
        answer = client.get(person["photo_url"])
        assert answer.status_code == 200, person["photo_url"]
        assert answer.headers["content-type"].startswith("image/")
