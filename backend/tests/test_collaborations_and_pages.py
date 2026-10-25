from tests.seed_data import COLLABORATIONS, PAGES


def test_the_collaborations_page_says_what_the_seed_says(client):
    answer = client.get("/api/collaborations")
    assert answer.status_code == 200
    page = answer.json()
    assert page["intro"] == PAGES["collaborations"]
    for wall in ("universities", "institutes", "companies"):
        assert [(c["name"], c["url"]) for c in page[wall]] == [(c["name"], c["url"]) for c in COLLABORATIONS[wall]], wall
    assert page["joint_projects"] == COLLABORATIONS["joint_projects"]


def test_every_logo_is_served(client):
    page = client.get("/api/collaborations").json()
    for wall in ("universities", "institutes", "companies"):
        for collaborator in page[wall]:
            answer = client.get(collaborator["logo_url"])
            assert answer.status_code == 200, collaborator["logo_url"]
            assert answer.headers["content-type"] == "image/png"


def test_the_people_page_has_its_intro(client):
    answer = client.get("/api/pages/people")
    assert answer.status_code == 200
    assert answer.json() == {"slug": "people", "intro": PAGES["people"]}


def test_an_unknown_page_is_not_found(client):
    answer = client.get("/api/pages/nothing")
    assert answer.status_code == 404
    assert answer.json() == {"detail": "Page not found"}
