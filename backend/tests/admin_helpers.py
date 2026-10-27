"""What the admin tests share: accounts, browsers that are logged in, pictures to upload, and the clean-up that leaves the shared test database as the seed made it."""
import io

from fastapi.testclient import TestClient
from sqlalchemy import select, text

from app.core.config import settings
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.person import Person
from app.services.grants import Preset
from app.services.users import create_user
from tests.seed_data import PEOPLE_BY_SLUG

GOOD = "correct horse battery staple"


def make_user(email: str, preset: Preset | None = None) -> None:
    with SessionLocal() as db:
        create_user(db, email, email.split("@")[0].title(), GOOD, preset)


def browser_for(email: str) -> TestClient:
    """A browser of its own, already logged in as this user (its cookies are shared with no other test)."""
    client = TestClient(app)
    answer = client.post("/api/auth/login", json={"email": email, "password": GOOD})
    assert answer.status_code == 200, answer.text
    return client


def image_bytes(fmt: str = "JPEG", size: tuple[int, int] = (60, 80), mode: str = "RGB", color=(200, 30, 30), exif_make: str | None = None) -> bytes:
    from PIL import Image  # here, so that the tests that do not upload a photo run without Pillow

    picture = Image.new(mode, size, color)
    out = io.BytesIO()
    kwargs = {}
    if exif_make:
        exif = Image.Exif()
        exif[0x010F] = exif_make  # the camera's make: stands for the whole of the EXIF data, GPS position included
        kwargs["exif"] = exif.tobytes()
    picture.save(out, fmt, **kwargs)
    return out.getvalue()


def cleanup_admin_data() -> None:
    """Back to what the seed made: no accounts, no audit rows, no people but the seed's, no photo files but theirs."""
    with engine.begin() as connection:
        connection.execute(text("DELETE FROM audit_log"))
        connection.execute(text("DELETE FROM login_attempts"))
        connection.execute(text("DELETE FROM users"))
        connection.execute(text("DELETE FROM people WHERE slug <> ALL(:slugs)"), {"slugs": list(PEOPLE_BY_SLUG)})
    with SessionLocal() as db:
        kept = {path for path in db.scalars(select(Person.photo)) if path}
    folder = settings.media_dir / "people"
    if folder.exists():
        for file in folder.iterdir():
            if f"people/{file.name}" not in kept:
                file.unlink()
