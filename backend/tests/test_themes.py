import pytest

from tests.seed_data import PEOPLE_BY_SLUG, RANKS, THEMES, ranked

SLUGS = [t["slug"] for t in THEMES]


def test_the_themes_come_in_the_order_of_the_site(client):
    answer = client.get("/api/themes")
    assert answer.status_code == 200
    themes = answer.json()
    assert [t["slug"] for t in themes] == SLUGS
    for theme, seeded in zip(themes, THEMES):
        assert theme["name"] == seeded["name"]
        assert theme["short_name"] == seeded["short_name"]
        assert theme["home_summary"] == seeded["home_summary"]


def test_an_unknown_theme_is_not_found(client):
    answer = client.get("/api/themes/nothing")
    assert answer.status_code == 404
    assert answer.json() == {"detail": "Theme not found"}


@pytest.mark.parametrize("slug", SLUGS)
def test_a_theme_says_what_the_seed_says(client, slug):
    seeded = next(t for t in THEMES if t["slug"] == slug)
    theme = client.get(f"/api/themes/{slug}").json()
    assert theme["intro"] == seeded["intro"]
    assert theme["funded_blurb"] == seeded["funded_blurb"]
    assert [g["title"] for g in theme["topic_groups"]] == [g["title"] for g in seeded["groups"]]
    for group, group_seeded in zip(theme["topic_groups"], seeded["groups"]):
        assert group["topics"] == group_seeded["topics"]


@pytest.mark.parametrize("slug", SLUGS)
def test_the_people_of_a_research_area_come_by_rank_then_as_written(client, slug):
    seeded = next(t for t in THEMES if t["slug"] == slug)
    theme = client.get(f"/api/themes/{slug}").json()
    for group, group_seeded in zip(theme["topic_groups"], seeded["groups"]):
        assert [p["slug"] for p in group["people"]] == ranked(group_seeded["people"])
        ranks = [RANKS.index(p["title"]) for p in group["people"]]
        assert ranks == sorted(ranks)


@pytest.mark.parametrize("slug", SLUGS)
def test_projects_and_figures(client, slug):
    seeded = next(t for t in THEMES if t["slug"] == slug)
    theme = client.get(f"/api/themes/{slug}").json()
    for status in ("ongoing", "ended"):
        assert theme["projects"][status] == seeded["projects"][status]
    ongoing, ended = len(seeded["projects"]["ongoing"]), len(seeded["projects"]["ended"])
    assert theme["stats"] == {"ongoing": ongoing, "ended": ended, "total": ongoing + ended}


@pytest.mark.parametrize("slug", SLUGS)
def test_the_people_to_refer_to_come_by_rank(client, slug):
    seeded = next(t for t in THEMES if t["slug"] == slug)
    theme = client.get(f"/api/themes/{slug}").json()
    assert [p["slug"] for p in theme["refer_to"]] == ranked(seeded["refer_to"])
    assert all(PEOPLE_BY_SLUG[p["slug"]]["name"] == p["name"] for p in theme["refer_to"])


@pytest.mark.parametrize("slug", SLUGS)
def test_the_highlight_cards_with_their_pictures(client, slug):
    seeded = next(t for t in THEMES if t["slug"] == slug)["highlights"]
    theme = client.get(f"/api/themes/{slug}").json()
    paper, project = theme["highlight_paper"], theme["highlight_project"]
    assert (paper["title"], paper["authors_full"], paper["authors_short"], paper["venue"]) == (
        seeded["paper"]["title"],
        seeded["paper"]["authors_full"],
        seeded["paper"]["authors_short"],
        seeded["paper"]["venue"],
    )
    assert paper["tags"] == seeded["paper"]["tags"]
    assert (project["title"], project["subtitle"], project["url"]) == (seeded["project"]["title"], seeded["project"]["subtitle"], seeded["project"]["url"])
    for card in (paper, project):
        assert card["image_url"].startswith("/media/highlights/")
        picture = client.get(card["image_url"])
        assert picture.status_code == 200
        assert picture.headers["content-type"] == "image/jpeg"
