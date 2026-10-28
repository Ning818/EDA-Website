# EDA Group website

The website of the EDA Group (Politecnico di Torino), made of three applications in one repository. They are different and isolated: each has its own dependencies, build, settings and port,
none imports another's code, and they meet only through the API's HTTP routes.

| Folder | What it is | Stack | Port | Read |
|---|---|---|---|---|
| [`frontend/`](frontend/) | the public website: what visitors read | React, Vite, Tailwind | 5173 | [`frontend/README.md`](frontend/README.md) |
| [`backend/`](backend/) | the API and the database, and the routes the admin uses | FastAPI, PostgreSQL | 8001 | [`backend/README.md`](backend/README.md) |
| [`admin/`](admin/) | the interface the group's staff use to keep the site up to date | React, Vite, Tailwind | 5174 | [`admin/README.md`](admin/README.md) |

The website only reads from the API. Everything that changes the content goes through the admin, which logs in and talks to the API's `/api/admin/...` routes.

## Run it locally

Each application is started from its own folder (the backend's first steps, with the database, are in [`backend/README.md`](backend/README.md)).

```bash
# the database and the API first: see backend/README.md
cd frontend
npm install
npm run dev      # http://localhost:5173

cd admin
npm install
npm run dev      # http://localhost:5174
```

The two Vite dev servers forward `/api` and `/media` to the API on port 8001.
