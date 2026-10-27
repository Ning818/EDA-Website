"""Photos of people: what is uploaded is checked by its content (never by its name or the type the browser claims), made smaller, cleaned of everything but the picture (the EXIF
data of a phone photo can hold where it was taken) and stored under a name made here, never one the user chose. SVG is refused: it can carry a script."""
import hashlib
import io
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import settings

MAX_BYTES = 5 * 1024 * 1024
MAX_SIDE = 1200  # a photo is shown small; a bigger one is only a heavier download
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
# a picture of more pixels than this is refused before it is unpacked (a small file can unpack to an enormous picture)
Image.MAX_IMAGE_PIXELS = 40_000_000

FOLDER = "people"


class InvalidPhoto(ValueError):
    """The file is not a photo that can be used; the message can be shown."""


class PhotoTooLarge(InvalidPhoto):
    pass


def prepare(data: bytes) -> tuple[bytes, str]:
    """The photo as it will be stored, and its file extension (`jpg`, or `png` where the picture has transparent parts)."""
    if len(data) > MAX_BYTES:
        raise PhotoTooLarge(f"The photo is larger than {MAX_BYTES // (1024 * 1024)} MB.")
    try:
        with Image.open(io.BytesIO(data)) as probe:
            if probe.format not in ALLOWED_FORMATS:
                raise InvalidPhoto("Use a JPEG, PNG or WebP image.")
            probe.verify()
        with Image.open(io.BytesIO(data)) as opened:
            if getattr(opened, "n_frames", 1) > 1:
                opened.seek(0)
            image = ImageOps.exif_transpose(opened)  # turned the way the camera meant it; the rest of the EXIF data is not carried over
            image.load()
    except InvalidPhoto:
        raise
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError, Image.DecompressionBombError) as error:
        raise InvalidPhoto("That file is not a photo that can be used. Use a JPEG, PNG or WebP image.") from error

    has_alpha = image.mode in ("RGBA", "LA", "PA") or (image.mode == "P" and "transparency" in image.info)
    image.thumbnail((MAX_SIDE, MAX_SIDE), Image.Resampling.LANCZOS)
    out = io.BytesIO()
    if has_alpha:
        image.convert("RGBA").save(out, "PNG", optimize=True, icc_profile=None)
        return out.getvalue(), "png"
    image.convert("RGB").save(out, "JPEG", quality=90, optimize=True)
    return out.getvalue(), "jpg"


def stored_path(slug: str, data: bytes, extension: str) -> str:
    """The path under the media folder: the person's slug and a few characters of the picture's own hash, so a replaced photo has a new address and no cache keeps the old one."""
    return f"{FOLDER}/{slug}-{hashlib.sha256(data).hexdigest()[:10]}.{extension}"


def _inside_people_folder(path: str) -> Path:
    root = (settings.media_dir / FOLDER).resolve()
    target = (settings.media_dir / path).resolve()
    if root not in target.parents:
        raise ValueError("Not a photo path")
    return target


def write(path: str, data: bytes) -> None:
    target = _inside_people_folder(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)


def delete(path: str) -> None:
    """Remove a stored photo (nothing happens if it is not there)."""
    _inside_people_folder(path).unlink(missing_ok=True)
