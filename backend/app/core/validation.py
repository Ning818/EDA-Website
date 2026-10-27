"""What may be typed into a field of the admin: plain text and web addresses, nothing that could run in a visitor's browser. Every write goes through these (the services in
app/services), so no entry point can skip them."""
import re
from urllib.parse import urlsplit

URL_MAX = 500


class InvalidInput(ValueError):
    """A field is not acceptable; `field` says which one and `message` can be shown as it is."""

    def __init__(self, field: str, message: str):
        super().__init__(message)
        self.field = field
        self.message = message


# control characters, tabs and line breaks included: these fields are one line
_CONTROL = re.compile(r"[\x00-\x1f\x7f]")


def clean_text(value: str | None, field: str, *, label: str, max_length: int, required: bool = False) -> str | None:
    """One line of plain text: spaces tidied up, no < or > (so no HTML can be typed in), not longer than `max_length`. Empty gives None, or an error where it is required."""
    text = " ".join(str(value or "").split())
    if not text:
        if required:
            raise InvalidInput(field, f"{label} is required.")
        return None
    if _CONTROL.search(text):
        raise InvalidInput(field, f"{label} must not contain control characters.")
    if "<" in text or ">" in text:
        raise InvalidInput(field, f"{label} must be plain text, without < or >.")
    if len(text) > max_length:
        raise InvalidInput(field, f"{label} must be at most {max_length} characters long.")
    return text


def clean_url(value: str | None, field: str, *, label: str) -> str | None:
    """A web address that starts with http:// or https:// and names a host (so never javascript: or data:). Empty gives None."""
    url = (value or "").strip()
    if not url:
        return None
    if len(url) > URL_MAX:
        raise InvalidInput(field, f"{label} must be at most {URL_MAX} characters long.")
    if re.search(r"[\s<>\"]", url):
        raise InvalidInput(field, f"{label} must not contain spaces or the characters < > \".")
    try:
        parts = urlsplit(url)
    except ValueError:
        raise InvalidInput(field, f"{label} is not a valid web address.") from None
    if parts.scheme.lower() not in ("http", "https") or not parts.netloc:
        raise InvalidInput(field, f"{label} must be a web address starting with http:// or https://.")
    return url
