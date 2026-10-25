"""Test setup: a database of its own, built the way a new installation is built.

The tests never touch the development database. The app is pointed (through the environment, before it is imported) at the database `eda_test`, which is created on the
same PostgreSQL server if it is not there, emptied at the start of every run, filled by the Alembic migrations (so the migrations are tested too) and by the seed data, and the
files the app serves are written to a throw-away folder. Docker's PostgreSQL must be running (`docker compose up -d`).
"""
import os
import tempfile

TEST_DB = "eda_test"
# before anything of the app is imported: its settings read these
os.environ["POSTGRES_DB"] = TEST_DB
os.environ["MEDIA_DIR"] = tempfile.mkdtemp(prefix="eda-test-media-")

import psycopg  # noqa: E402
import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.core.config import BACKEND_DIR, settings  # noqa: E402
from app.db.session import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app import seed  # noqa: E402


def alembic_config() -> Config:
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    return config


def seed_everything() -> None:
    with SessionLocal() as db:
        seed.seed_people(db)
        seed.seed_themes(db)
        seed.seed_collaborations(db)
        seed.seed_pages(db)
        db.commit()


def _create_test_database() -> None:
    assert settings.postgres_db == TEST_DB, "the tests must run against the test database only"
    with psycopg.connect(
        host=settings.postgres_host,
        port=settings.postgres_port,
        user=settings.postgres_user,
        password=settings.postgres_password,
        dbname="postgres",
        autocommit=True,
        connect_timeout=10,
    ) as connection:
        if not connection.execute("SELECT 1 FROM pg_database WHERE datname = %s", (TEST_DB,)).fetchone():
            connection.execute(f'CREATE DATABASE "{TEST_DB}"')


@pytest.fixture(scope="session", autouse=True)
def database():
    """An empty test database, built by the migrations and filled by the seed data."""
    _create_test_database()
    assert str(engine.url.database) == TEST_DB
    with engine.begin() as connection:
        connection.execute(text("DROP SCHEMA public CASCADE"))
        connection.execute(text("CREATE SCHEMA public"))
    command.upgrade(alembic_config(), "head")
    seed_everything()
    yield


@pytest.fixture(scope="session")
def client(database):
    with TestClient(app) as test_client:
        yield test_client
