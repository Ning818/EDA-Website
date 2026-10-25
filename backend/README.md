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
  seed/              the starting data: people.json (+ photos/), themes.json (+ highlights/), collaborations.json (+ logos/), pages.json, site.json
  media/             the files the API serves under /media (not committed; created by the seed)
  docker-compose.yml PostgreSQL for local development
```

## Run it locally

From this folder (`backend/`):

```bash
# 1. settings: copy the example, then set your own database password and a SESSION_SECRET (a long random string:
#    python -c "import secrets; print(secrets.token_urlsafe(48))")
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

# 6. the first admin account (asks for the password on the terminal)
.venv/Scripts/python -m app.manage create-user --email you@example.org --name "Your Name" --role admin

# 7. the API, on http://localhost:8001 (interactive docs at /docs)
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
| `GET /api/site` | the footer's phone number (with the digits that dial it) and fax number |
| `GET /api/pages/{slug}` | the fixed paragraph under the title of a page that is not a theme's: `people` (the Collaborations page's comes with `/api/collaborations`) |
| `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | log in with an email and a password, log out, who is logged in (see "Accounts and login") |
| `GET /media/...` | the files: people's photos (`/media/people/`), the collaborators' logos (`/media/collaborators/`) and the highlight cards' pictures (`/media/highlights/`) |

A person has a name (and `card_name`, the name as the small cards write it), a title (and `title_short`, the form for the small cards), a group, a photo address, the links they have (`polito`, `orcid`, `linkedin`, `dept`, `iris`) and `page_url` / `page_kind`, the page a small card links to: the polito.it staff page, else the research profile on IRIS. The group follows from the title. Wherever the API lists people for the small cards (a research area, the people to refer to) they come ranked: full professors first, then associate and assistant professors, research fellows, PhD students and former members, and within a rank in the order they were written.

What a theme looks like (its colour, the artwork in its page headers, its addresses) stays in the site's code (`src/themes.js`); what it says is here - including its name. The code holds default names and paragraphs too (`src/themes.js`), which the site shows until the API answers or if it cannot be reached; the last answer is kept in the visitor's browser, so a repeat visit shows the current words at once. A theme the API lists that the code has no template for is not shown: the code decides which themes the site can draw.

## How the site reaches the API

In development the pages ask their own address for `/api/...` and `/media/...`; the Vite dev server (`vite.config.js`, at the repository root) forwards both to the API on port 8001. So a phone or an iPad on the same Wi-Fi needs only the page's address (`http://<this computer>:5173`), the API listens on this computer only, and there is no CORS to allow. In production the web server in front of the site must forward the same two paths to the API (`VITE_API_URL` points the site at an API on another address instead).

To work on the site, run both: `npm run dev` at the repository root, and the API (step 7 above). The People, Research, Funded Projects and Collaborations pages ask the API for what they show, and show a placeholder while it is on its way and a message with a "Try again" button when the API cannot be reached. The home page and the pages' structure and artwork do not depend on the API.

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

### The footer (`seed/site.json`)

Only the phone and fax numbers are in the database; the rest of the footer (the names, the address, the "Visit" links, the LinkedIn and YouTube icons) is written in the code (`src/components/layout/Footer.jsx`). The footer is on every page and never waits for the API: the code keeps the same numbers as defaults (`src/site.js`), and the visitor's last answer is kept in the browser. A number that is empty leaves its line out of the footer. The "Department website" link in the code (www.dauin.polito.it/en/) did not answer when this was checked.

### Collaborations (`seed/collaborations.json`)

Each organisation has its own website (`url`); a company's address is the one of its Italian or English site, not its bare domain, which sends visitors on to the site of the country they are in (Intel's, for one, to its Chinese site). The joint projects are examples taken from the projects' records on CORDIS (the EU's research information service): the project, its funding programme and years, who coordinated it, and its other partners that are among the collaborators (the record names Fraunhofer as the Fraunhofer-Gesellschaft, not its institute FIT). The page pads each logo wall with empty slots to whole rows of five, so the list holds only the real organisations.

## Photos, logos and pictures

The photos, logos and the highlight cards' pictures are files in the `media/` folder; the database keeps only each file's path (`people.photo`, `collaborators.logo`, `highlights.image`). A highlight card without a picture shows the site's neutral placeholder. The API turns that path into an address in one place (`app/core/media.py`), so moving the files to object storage or a CDN later changes that function and nothing else. If the API runs where the disk is wiped on every deploy, `media/` must be a persistent volume.

## Tests

```bash
docker compose up -d                                  # the tests need PostgreSQL
.venv/Scripts/pip install -r requirements-dev.txt     # pytest and the test client
.venv/Scripts/python -m pytest                        # about 5 seconds
```

The tests never touch the development database: they use their own, `eda_test` (created on the same server if it is missing, emptied at the start of every run, built by the Alembic migrations and filled by the seed data), and write the served files to a throw-away folder. They check that:

- the API says what the seed files say - the people in the order of the People page, the groups, the ranking of the small cards, the themes' words, research areas, projects and figures, the highlight cards, the collaborators and joint projects - and that every photo, logo and picture it names is served;
- errors are the right ones: 404 for what is not there, 422 for a group that does not exist, 503 (not 500) for every route when the database is down, no file outside `media/` reachable, and only the front end allowed to call from a browser;
- the login: passwords, the lock after wrong tries, what ends a session, the cross-site check and the roles, and the command line for the accounts;
- the migrations and the models agree (a model changed without a migration fails), and the migrations go down and up again;
- the seed can be run twice without changing anything, its files are in English, every address in them is `http` or `https`, and every file they name exists.

Run them after every change; when a model changes, make its migration first.

## Accounts and login

There is no sign-up: an admin makes the accounts, from the command line (the password is asked for on the terminal, never given as an argument):

```bash
.venv/Scripts/python -m app.manage create-user --email ada@example.org --name "Ada Lovelace" --role admin   # roles: admin, editor
.venv/Scripts/python -m app.manage set-password --email ada@example.org     # ends all of that user's logins
.venv/Scripts/python -m app.manage deactivate --email ada@example.org       # activate: the other way
.venv/Scripts/python -m app.manage list-users
```

- **Passwords** are stored only as Argon2id hashes. A password is 12 to 128 characters (length is what counts, a phrase of a few words is fine) and is not the email.
- **Roles:** `editor` edits the content, `admin` also manages the users. Routes ask for a role with `Depends(require_role(...))` (`app/dependencies.py`).
- **The login** is a signed cookie (`eda_session`): HttpOnly, SameSite=Lax, and Secure where `SESSION_COOKIE_SECURE=true` (set it wherever the site is served over HTTPS). It ends after 2 hours without a request, 12 hours after the login whatever happens, when the account is switched off or deleted, and when the password is changed. Visitors who only read the site get no cookie.
- **Wrong passwords:** after 5 wrong tries for an email the login is refused for 15 minutes, even with the right password. An email nobody has is counted the same, and a wrong email and a wrong password get the same answer, so nothing tells which accounts exist. The times and numbers are settings (`LOGIN_MAX_FAILURES`, `LOGIN_LOCK_MINUTES`, `SESSION_IDLE_MINUTES`, `SESSION_MAX_HOURS`).
- **Pages of other sites:** every route that changes something checks the request's `Origin` (`check_origin`): it must be the site's own address or one of `CORS_ORIGINS`, so another site cannot make a logged-in visitor's browser send it.
- Behind a reverse proxy the proxy must pass the `Host` header on (`proxy_set_header Host $host;`) and the API must be started with `--proxy-headers`.

## Planned: the admin (not built yet)

The group's members are to edit the content themselves, in an admin at `/admin` inside this app (SQLAdmin, using the accounts and login above). The accounts and the login are built; the admin itself is not. What is decided so far:

- **New theme:** a developer builds its particle cloud, models and header artwork and redeploys the front end; the staff then add the theme's own text in the admin and tick `published`. The theme list becomes the code's templates (`src/themes.js`: slug, colour, artwork) joined by slug to the database's content. Nothing is copied from another theme, and no code or particle bundle is ever uploaded through the admin.
- **Highlight cards** (paper and project): everything on them - title, authors, venue, keywords, text, link, picture - is entered by hand; nothing is read from IRIS.
- **Fields the admin forms add for accessibility** (to be added with the forms, with a migration):
  - `image_alt` on `highlights` (and on any picture the admin later takes): the picture's text alternative. Empty means the site writes one from the title, as it does today; a decorative picture can be marked so, and a screen reader then skips it.
  - `language` on projects (and on any text that is not English, such as the Italian project names): an ISO code such as `it`, which the site writes as `lang="it"` on that text so a screen reader pronounces it right. Empty means English.
- **Accessibility of the admin itself:** SQLAdmin's keyboard and screen-reader behaviour is to be tested once it is in; the login session must warn before it ends, so a form half filled is not lost.

## Migrations

After changing a model in `app/models/`:

```bash
.venv/Scripts/alembic revision --autogenerate -m "what changed"
.venv/Scripts/alembic upgrade head
```

`docker compose down` stops the database and keeps its data; `docker compose down -v` deletes the data too.
