import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy.exc import OperationalError

from app.core.config import settings
from app.routers import auth, collaborations, health, pages, people, themes

logger = logging.getLogger("uvicorn.error")

app = FastAPI(title=settings.project_name)


@app.exception_handler(OperationalError)
async def database_unreachable(request: Request, exc: OperationalError) -> JSONResponse:
    """Whatever route needed the database when it was down: a 503 with one line in the log, not a 500 with a page of traceback."""
    logger.warning("Database unreachable for %s: %s", request.url.path, exc.orig)
    return JSONResponse(status_code=503, content={"detail": "Database unreachable"})


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Who is logged in is kept in a signed cookie (HttpOnly, SameSite=Lax; Secure where the site is served over HTTPS). Nobody who only reads the site gets a cookie: it is set
# only once a session has something in it, that is, after a login. It is renewed with every request, so it ends after `session_idle_minutes` of nothing.
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret,
    session_cookie=settings.session_cookie_name,
    max_age=settings.session_idle_minutes * 60,
    same_site="lax",
    https_only=settings.session_cookie_secure,
)

# every router sits under /api; each one names its own path and tag (app/routers)
app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(people.router, prefix="/api")
app.include_router(themes.router, prefix="/api")
app.include_router(collaborations.router, prefix="/api")
app.include_router(pages.router, prefix="/api")

# the files under the media folder (people's photos) are served as they are
settings.media_dir.mkdir(parents=True, exist_ok=True)
app.mount(settings.media_url, StaticFiles(directory=settings.media_dir), name="media")
