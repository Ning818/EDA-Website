from app.core.config import settings


def media_url(path: str | None) -> str | None:
    """The address a file under the media folder is served from; None when there is no file.

    This is the one place that knows where the files live: moving them to object storage / a CDN later means returning that address here.
    """
    if not path:
        return None
    return f"{settings.media_url}/{path}"
