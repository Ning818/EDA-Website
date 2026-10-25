# EDA Group API

FastAPI + PostgreSQL backend for the EDA Group website, laid out as FastAPI's "Bigger Applications - Multiple Files".

```
backend/
  app/
    main.py          the FastAPI app: CORS, and every router under /api
    dependencies.py  shared dependencies (the database session)
    core/config.py   settings from backend/.env
    db/              Base (parent of the models) and the engine / session
    models/          table models (SQLAlchemy)
    schemas/         request and response shapes (Pydantic)
    routers/         one file per resource, each with its own path and tag
    internal/        admin-only routes (later)
  alembic/           database migrations
  docker-compose.yml PostgreSQL for local development
```

## Run it locally

From this folder (`backend/`):

```bash
# 1. settings: copy the example and set your own password
cp .env.example .env

# 2. the database (Docker Desktop must be running)
docker compose up -d

# 3. Python environment
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt      # Windows; on macOS / Linux: .venv/bin/pip

# 4. create / update the tables
.venv/Scripts/alembic upgrade head

# 5. the API, on http://localhost:8001 (interactive docs at /docs)
.venv/Scripts/uvicorn app.main:app --reload --port 8001
```

Check: `GET /api/health` (the API is up) and `GET /api/health/db` (it reaches the database).

## Migrations

After changing a model in `app/models/`:

```bash
.venv/Scripts/alembic revision --autogenerate -m "what changed"
.venv/Scripts/alembic upgrade head
```

`docker compose down` stops the database and keeps its data; `docker compose down -v` deletes the data too.
