import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import OperationalError

from app.core.config import settings
from app.routers import collaborations, health, pages, people, themes

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

# every router sits under /api; each one names its own path and tag (app/routers)
app.include_router(health.router, prefix="/api")
app.include_router(people.router, prefix="/api")
app.include_router(themes.router, prefix="/api")
app.include_router(collaborations.router, prefix="/api")
app.include_router(pages.router, prefix="/api")

# the files under the media folder (people's photos) are served as they are
settings.media_dir.mkdir(parents=True, exist_ok=True)
app.mount(settings.media_url, StaticFiles(directory=settings.media_dir), name="media")
