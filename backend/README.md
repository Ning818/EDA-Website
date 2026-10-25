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
  seed/              the starting data: people.json (+ photos/), themes.json (+ highlights/), collaborations.json (+ logos/), pages.json
  media/             the files the API serves under /media (not committed; created by the seed)
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

# 5. load the starting data (people, themes, collaborations, with the photos and logos); safe to run again
.venv/Scripts/python -m app.seed

# 6. the API, on http://localhost:8001 (interactive docs at /docs)
.venv/Scripts/uvicorn app.main:app --reload --port 8001
```

Check: `GET /api/health` (the API is up) and `GET /api/health/db` (it reaches the database).

## What the API offers

| Address | What it returns |
|---|---|
| `GET /api/people` | the people, in the order of the People page; `?group=professors`, `phd-students` or `alumni` keeps one group |
| `GET /api/people/{slug}` | one person, e.g. `/api/people/enrico-macii` |
| `GET /api/themes` | the themes: slug, name, short name and the paragraph beside the theme on the home page. The site asks this on every page: the nav bar, the page titles, the home page and the chapter dots all show these names |
| `GET /api/themes/{slug}` | everything a theme's Research page and Funded Projects page show: its words (intro, funded-projects line, highlight paper and project), research areas with their topics and people, ongoing and ended projects, the figures, and the people to refer to |
| `GET /api/collaborations` | the Collaborations page: the paragraph under its title, the logo walls of universities, institutes and companies, and the joint projects |
| `GET /api/pages/{slug}` | the fixed paragraph under the title of a page that is not a theme's: `people` (the Collaborations page's comes with `/api/collaborations`) |
| `GET /media/...` | the files: people's photos (`/media/people/`), the collaborators' logos (`/media/collaborators/`) and the highlight cards' pictures (`/media/highlights/`) |

A person has a name (and `card_name`, the name as the small cards write it), a title (and `title_short`, the form for the small cards), a group, a photo address, the links they have (`polito`, `orcid`, `linkedin`, `dept`, `iris`) and `page_url` / `page_kind`, the page a small card links to: the polito.it staff page, else the research profile on IRIS. The group follows from the title. Wherever the API lists people for the small cards (a research area, the people to refer to) they come ranked: full professors first, then associate and assistant professors, research fellows, PhD students and former members, and within a rank in the order they were written.

What a theme looks like (its colour, the artwork in its page headers, its addresses) stays in the site's code (`src/themes.js`); what it says is here - including its name. The code holds default names and paragraphs too (`src/themes.js`), which the site shows until the API answers or if it cannot be reached; the last answer is kept in the visitor's browser, so a repeat visit shows the current words at once. A theme the API lists that the code has no template for is not shown: the code decides which themes the site can draw.

## How the site reaches the API

In development the pages ask their own address for `/api/...` and `/media/...`; the Vite dev server (`vite.config.js`, at the repository root) forwards both to the API on port 8001. So a phone or an iPad on the same Wi-Fi needs only the page's address (`http://<this computer>:5173`), the API listens on this computer only, and there is no CORS to allow. In production the web server in front of the site must forward the same two paths to the API (`VITE_API_URL` points the site at an API on another address instead).

To work on the site, run both: `npm run dev` at the repository root, and the API (step 6 above). The People, Research, Funded Projects and Collaborations pages ask the API for what they show, and show a placeholder while it is on its way and a message with a "Try again" button when the API cannot be reached. The home page and the pages' structure and artwork do not depend on the API.

## Where the data in the seed comes from

### People

`seed/people.json` is the list the group's own People page gave (eda.polito.it/people, April 2026), in its order, with:

- Links by kind: `polito` (the person's polito.it staff page), `orcid`, `linkedin`, and `dept` / `iris`, the links on the person's own page of the group's site. The LinkedIn links of Ponzio, Bottaccioli, Di Cataldo and Vinco were supplied by the site's author, the others come from each person's polito.it staff page and ORCID record. The `dept` links point to the department sites (dauin.polito.it, dist.polito.it), which no longer answer; they are kept as they were.
- Alessio Mascolini and Pietro Rando Mazzarino are listed on that page as PhD candidates, but polito.it's staff directory has them as research fellows (assegnisti di ricerca), so their title is Research Fellow and they come first in the group "Research Fellows & PhD Students".
- A person without a photo would show their initials on the page; at present every person has a photo.

Adding or changing a person for now means editing `seed/people.json` (and putting the photo in `seed/photos/`), then running `python -m app.seed` again.

### Themes (`seed/themes.json`)

- **DRAFT, to be confirmed by the theme leads:** the research areas ("topic groups") and the placing of people in them are ours, not the group's. A person is placed in an area where the keywords on their polito.it staff page, or (for students and former members, who have no keywords there) the titles of their publications on IRIS, point to the same subject. People from the group's earlier flat list for a theme whom nothing placed (Cipolletta, Mocerino and Grimaldi under VLSI-CAD; Enrico Macii under Bioinformatics) are left off the page. The research topics themselves are the group's own wording and order within an area.
- **Projects** are as the group's own pages give them (the texts kept as written there, with their spelling mistakes corrected). `code` is the project's acronym (a few projects are listed without one); `description` is its full name (a few have none: ARROWHEAD's official name is just "Arrowhead", so its line is the objective as the ARTEMIS-JU / CORDIS record states it); `url` is the project's own website, where the link the group's old page gave still leads to the project (many of those sites have since gone, or been taken over by something else, and are left out). The Industry 4.0 page lists no ended projects. The figures in the page headers are counted from these lists.
- **Highlight papers** are from the group's own publications in IRIS (iris.polito.it); `url` is the IRIS record and the text is condensed from the paper's abstract there. `authors_short` (initials) is shown on a phone. The Smart City paper has eleven authors, so it uses initials everywhere. **Highlight projects** are one from the theme's own list, with the group's role as the European Commission's CORDIS record gives it; the text is condensed from the record's objective, and `url` is the project's website where it still works, else its CORDIS record.

### Collaborations (`seed/collaborations.json`)

Each organisation has its own website (`url`); a company's address is the one of its Italian or English site, not its bare domain, which sends visitors on to the site of the country they are in (Intel's, for one, to its Chinese site). The joint projects are examples taken from the projects' records on CORDIS (the EU's research information service): the project, its funding programme and years, who coordinated it, and its other partners that are among the collaborators (the record names Fraunhofer as the Fraunhofer-Gesellschaft, not its institute FIT). The page pads each logo wall with empty slots to whole rows of five, so the list holds only the real organisations.

## Photos, logos and pictures

The photos, logos and the highlight cards' pictures are files in the `media/` folder; the database keeps only each file's path (`people.photo`, `collaborators.logo`, `highlights.image`). A highlight card without a picture shows the site's neutral placeholder. The API turns that path into an address in one place (`app/core/media.py`), so moving the files to object storage or a CDN later changes that function and nothing else. If the API runs where the disk is wiped on every deploy, `media/` must be a persistent volume.

## Migrations

After changing a model in `app/models/`:

```bash
.venv/Scripts/alembic revision --autogenerate -m "what changed"
.venv/Scripts/alembic upgrade head
```

`docker compose down` stops the database and keeps its data; `docker compose down -v` deletes the data too.
