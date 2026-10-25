from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL


class Settings(BaseSettings):
    """Settings read from the environment, or from backend/.env when run from the backend folder."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    project_name: str = "EDA Group API"

    postgres_user: str
    postgres_password: str
    postgres_db: str
    postgres_host: str = "127.0.0.1"  # not "localhost": on Windows with Docker that name first tries IPv6 and waits for the timeout
    postgres_port: int = 5432

    cors_origins: list[str] = ["http://localhost:5173"]

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
