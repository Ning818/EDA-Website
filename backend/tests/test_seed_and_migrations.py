import re
from urllib.parse import urlparse

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import text

from app.core.config import BACKEND_DIR
from app.db.base import Base
from app.db.session import engine
from tests.conftest import alembic_config, seed_everything
from tests.seed_data import COLLABORATIONS, PAGES, PEOPLE, PEOPLE_BY_SLUG, SEED_DIR, THEMES

TABLES = ["people", "themes", "highlights", "topic_groups", "topics", "topic_group_people", "projects", "theme_contacts", "collaborators", "joint_projects", "pages"]
CHINESE = re.compile(r"[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]")  # Chinese characters and CJK punctuation


def counts() -> dict[str, int]:
    with engine.connect() as connection:
        return {table: connection.execute(text(f"SELECT count(*) FROM {table}")).scalar_one() for table in TABLES}


# --- the database -----------------------------------------------------------------------------------------------------------------------------------------------------


def test_running_the_seed_again_changes_nothing():
    before = counts()
    seed_everything()
    assert counts() == before


def test_the_seed_filled_every_table():
    found = counts()
    assert found["people"] == len(PEOPLE)
    assert found["themes"] == len(THEMES)
    assert found["highlights"] == 2 * len(THEMES)
    assert found["collaborators"] == sum(len(COLLABORATIONS[w]) for w in ("universities", "institutes", "companies"))
    assert found["joint_projects"] == len(COLLABORATIONS["joint_projects"])
    assert found["pages"] == len(PAGES)
    assert found["projects"] == sum(len(t["projects"]["ongoing"]) + len(t["projects"]["ended"]) for t in THEMES)


def test_the_models_and_the_migrations_agree():
    """No model was changed without a migration for it: Alembic finds nothing to add."""
    with engine.connect() as connection:
        assert compare_metadata(MigrationContext.configure(connection), Base.metadata) == []


def test_the_migrations_go_down_and_up_again():
    config = alembic_config()
    try:
        command.downgrade(config, "base")
        with engine.connect() as connection:
            assert connection.execute(text("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name <> 'alembic_version'")).scalar_one() == 0
        command.upgrade(config, "head")
    finally:
        command.upgrade(config, "head")
        seed_everything()
    assert counts()["people"] == len(PEOPLE)


# --- the seed files ---------------------------------------------------------------------------------------------------------------------------------------------------


def test_the_seed_files_are_in_english():
    for path in SEED_DIR.glob("*.json"):
        assert not CHINESE.search(path.read_text(encoding="utf-8")), path.name


def _urls(value):
    """Every address in a seed structure: the values called url, and the values of links."""
    if isinstance(value, dict):
        for key, item in value.items():
            if key in ("url", "to") and isinstance(item, str):
                yield item
            elif key == "links" and isinstance(item, dict):
                yield from (u for u in item.values() if u)
            else:
                yield from _urls(item)
    elif isinstance(value, list):
        for item in value:
            yield from _urls(item)


def test_every_address_is_http_or_https():
    """An editor-typed address such as javascript:... would run when a visitor clicks it."""
    found = list(_urls([PEOPLE, THEMES, COLLABORATIONS]))
    assert len(found) > 100
    for url in found:
        assert urlparse(url).scheme in ("http", "https"), url


def test_every_file_the_seed_names_is_there():
    for person in PEOPLE:
        if person["photo"]:
            assert (SEED_DIR / "photos" / person["photo"]).is_file(), person["photo"]
    for theme in THEMES:
        for highlight in theme["highlights"].values():
            assert (SEED_DIR / "highlights" / highlight["image"]).is_file(), highlight["image"]
    for wall in ("universities", "institutes", "companies"):
        for collaborator in COLLABORATIONS[wall]:
            assert (SEED_DIR / "logos" / collaborator["logo"]).is_file(), collaborator["logo"]


def test_the_people_are_what_the_themes_refer_to():
    assert len({p["slug"] for p in PEOPLE}) == len(PEOPLE)
    for theme in THEMES:
        for group in theme["groups"]:
            assert set(group["people"]) <= PEOPLE_BY_SLUG.keys()
        assert set(theme["refer_to"]) <= PEOPLE_BY_SLUG.keys()


def test_the_secrets_and_the_uploads_are_not_in_the_repository():
    ignored = (BACKEND_DIR / ".gitignore").read_text(encoding="utf-8")
    for name in (".env", ".venv/", "media/"):
        assert name in ignored.splitlines(), name
