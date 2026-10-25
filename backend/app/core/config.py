from pathlib import Path

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
