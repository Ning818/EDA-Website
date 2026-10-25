"""The seed files as the tests read them: what the API must say is what they say."""
import json

from app.core.config import BACKEND_DIR

SEED_DIR = BACKEND_DIR / "seed"

GROUPS = ["professors", "phd-students", "alumni"]
# the order of the ranks on the small cards
RANKS = ["Full Professor", "Associate Professor", "Assistant Professor", "Research Fellow", "PhD Student", "Former member"]
GROUP_OF = {
    "Full Professor": "professors",
    "Associate Professor": "professors",
    "Assistant Professor": "professors",
    "Research Fellow": "phd-students",
    "PhD Student": "phd-students",
    "Former member": "alumni",
}


def load(name: str):
    return json.loads((SEED_DIR / name).read_text(encoding="utf-8"))


PEOPLE = load("people.json")
THEMES = load("themes.json")
COLLABORATIONS = load("collaborations.json")
PAGES = load("pages.json")
PEOPLE_BY_SLUG = {p["slug"]: p for p in PEOPLE}


def people_in_page_order(group: str | None = None) -> list[dict]:
    """The people as the People page lists them: group by group, and within a group by position."""
    chosen = [p for p in PEOPLE if group is None or GROUP_OF[p["title"]] == group]
    return sorted(chosen, key=lambda p: (GROUPS.index(GROUP_OF[p["title"]]), p["position"]))


def ranked(slugs: list[str]) -> list[str]:
    """Small-card order: by rank, and within a rank as they were written (the sort is stable)."""
    return sorted(slugs, key=lambda s: RANKS.index(PEOPLE_BY_SLUG[s]["title"]))
