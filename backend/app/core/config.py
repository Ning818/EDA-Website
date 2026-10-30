from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Settings read from the environment, or from backend/.env wherever the API is started from."""

    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    project_name: str = "EDA Group API"

    postgres_user: str
    postgres_password: str
    postgres_db: str
    postgres_host: str = "127.0.0.1"  # not "localhost": on Windows with Docker that name first tries IPv6 and waits for the timeout
    postgres_port: int = 5432

    cors_origins: list[str] = ["http://localhost:5173"]

    # Login. The cookie that says who is logged in is signed with `session_secret` (a long random string, secret, different on every installation).
    # It lives `session_idle_minutes` after the last request and, whatever the visitor does, `session_max_hours` after the login. `session_cookie_secure`: true where the
    # site is served over HTTPS, so the cookie is never sent over plain HTTP.
    session_secret: str = Field(min_length=32)
    session_cookie_name: str = "eda_session"
    session_cookie_secure: bool = False
    session_idle_minutes: int = 120
    session_max_hours: int = 12
    # after `login_max_failures` wrong passwords for an email (an email nobody has counts the same) the login is refused for `login_lock_minutes`
    login_max_failures: int = 5
    login_lock_minutes: int = 15

    # the check of the links in the content (python -m app.manage check-links): a link is reported to the user who keeps it after `link_fail_threshold` failed checks in a row,
    # and a check waits `link_timeout_seconds` for an answer
    link_fail_threshold: int = 3
    link_timeout_seconds: int = 10

    # files the API keeps and serves (people's photos): in this folder, under this address
    media_dir: Path = BACKEND_DIR / "media"
    media_url: str = "/media"

    @property
    def database_url(self) -> URL:
        # built as a URL object so that characters in the password need no escaping
        return URL.create(
            "postgresql+psycopg",
            username=self.postgres_user,
            password=self.postgres_password,
            host=self.postgres_host,
            port=self.postgres_port,
            database=self.postgres_db,
        )


settings = Settings()
