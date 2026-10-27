# EDA Group API

FastAPI + PostgreSQL backend for the EDA Group website, laid out as FastAPI's "Bigger Applications - Multiple Files".

```
backend/
  app/
    main.py          the FastAPI app: CORS, and every router under /api
    dependencies.py  shared dependencies: the database session, the login and the grant checks
    core/config.py   settings from backend/.env
    db/              Base (parent of the models) and the engine / session
    models/          table models (SQLAlchemy)
    schemas/         request and response shapes (Pydantic)
    routers/         one file per resource, each with its own path and tag
    services/        the rules: accounts, who may do what (grants), validation of what is typed, photos, people, the audit log
    internal/        the admin's routes: all under /api/admin, all need a login; nothing public imports them
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
.venv/Scripts/python -m app.manage create-user --email you@example.org --name "Your Name" --preset administrative

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
.venv/Scripts/python -m pytest                        # about 15 seconds
```

The tests never touch the development database: they use their own, `eda_test` (created on the same server if it is missing, emptied at the start of every run, built by the Alembic migrations and filled by the seed data), and write the served files to a throw-away folder. They check that:

- the API says what the seed files say - the people in the order of the People page, the groups, the ranking of the small cards, the themes' words, research areas, projects and figures, the highlight cards, the collaborators and joint projects - and that every photo, logo and picture it names is served;
- errors are the right ones: 404 for what is not there, 422 for a group that does not exist, 503 (not 500) for every route when the database is down, no file outside `media/` reachable, and only the front end allowed to call from a browser;
- the login: passwords, the lock after wrong tries, what ends a session, the cross-site check, and the command line for the accounts;
- the grants and the presets, and what the database itself refuses (the same grant twice, a theme on a grant that is not about one);
- the accounts the staff keep: who may, the temporary password (shown once, kept only as a hash, to be changed before anything else works), switching accounts off, new grants, resets, and that the last account able to manage accounts is never lost;
- the admin's people routes: who may add, correct and let a person leave, what is refused (HTML in a name, a `javascript:` link, a photo that is not a photo or has no consent, a name that is already there), what is kept (the photo without its EXIF data, who confirmed the consent, an audit row) and that a failed change leaves nothing behind;
- the shape that keeps the apps apart: nothing public imports the admin, every admin route needs a login, and nothing outside `/api/admin` changes anything but the login;
- the migrations and the models agree (a model changed without a migration fails), and the migrations go down and up again;
- the seed can be run twice without changing anything, its files are in English, every address in them is `http` or `https`, and every file they name exists.

Run them after every change; when a model changes, make its migration first.

## Accounts and login

There is no sign-up. The administrative staff make the accounts in the admin (see "The admin" below). The developer's command line goes round that on purpose, as the way back in if the staff are locked out, and makes the first account (the password is asked for on the terminal, never given as an argument):

```bash
.venv/Scripts/python -m app.manage create-user --email ada@example.org --name "Ada Lovelace" --preset administrative   # or theme-owner, projects-owner; none: may do nothing
.venv/Scripts/python -m app.manage grant --email ada@example.org --area theme [--theme vlsi-cad]   # no --theme: every theme
.venv/Scripts/python -m app.manage revoke --email ada@example.org --area theme
.venv/Scripts/python -m app.manage set-password --email ada@example.org     # ends all of that user's logins
.venv/Scripts/python -m app.manage deactivate --email ada@example.org       # activate: the other way
.venv/Scripts/python -m app.manage list-users
```

- **Passwords** are stored only as Argon2id hashes. An account made by the staff, or given a new password by them, starts with a temporary one that is shown once and has to be changed at the first login. A password is 12 to 128 characters (length is what counts, a phrase of a few words is fine) and is not the email.
- **Grants, not roles:** what a user may do is what their grants say (see "The admin" below); routes ask with `Depends(require_grant(Area.ACCOUNTS))` (`app/dependencies.py`) and the services check again.
- **The login** is a signed cookie (`eda_session`): HttpOnly, SameSite=Lax, and Secure where `SESSION_COOKIE_SECURE=true` (set it wherever the site is served over HTTPS). It ends after 2 hours without a request, 12 hours after the login whatever happens, when the account is switched off or deleted, and when the password is changed. Visitors who only read the site get no cookie.
- **Wrong passwords:** after 5 wrong tries for an email the login is refused for 15 minutes, even with the right password. An email nobody has is counted the same, and a wrong email and a wrong password get the same answer, so nothing tells which accounts exist. The times and numbers are settings (`LOGIN_MAX_FAILURES`, `LOGIN_LOCK_MINUTES`, `SESSION_IDLE_MINUTES`, `SESSION_MAX_HOURS`).
- **Pages of other sites:** every route that changes something checks the request's `Origin` (`check_origin`): it must be the site's own address or one of `CORS_ORIGINS`, so another site cannot make a logged-in visitor's browser send it.
- Behind a reverse proxy the proxy must pass the `Host` header on (`proxy_set_header Host $host;`) and the API must be started with `--proxy-headers`.

## The admin

### Separate applications

The public website (the front end at the repository root), this API and the admin are three different, isolated applications. They may share one repository for simplicity, but each has
its own dependencies, build, settings and port, none imports another's code, and they meet only through this API's HTTP routes. The website only reads (`GET`); every change to the
content comes through the admin's routes (`/api/admin/...`), which the website never calls. The admin's interface is a front-end application of its own - not built yet - that goes in a
folder of its own next to `backend/`, never inside the website's `src/`. `tests/test_architecture.py` keeps the API's side of this honest.

### Why the admin's routes share this process, and how to split them

For now the admin's routes (`app/internal/`, under `/api/admin`) and the login routes run in the same FastAPI process as the public read routes. That is the usual shape for a small site
(WordPress, Django's admin and Strapi or Directus all work this way): the protection that matters is the login, the per-area grants, the cross-site check, the validation and the audit
log, and all of those are in place. The project is only run locally so far, and a second process would only add something to start, deploy and hand over. Whether to split them is to be
decided before the site goes live, once it is known what the university can host and who may reach the admin (it may be limited to the campus network, which a reverse proxy can also
do by restricting `/api/admin` without any change to the code).

What keeps a later split cheap, and must be kept:

- the admin's routes stay in `app/internal/` under `/api/admin`, and no public route imports them (`tests/test_architecture.py` checks it);
- the rules and the validation stay in `app/services/`, never in a route;
- the admin's interface stays a separate front-end application that only uses the HTTP routes.

To split, when needed: add a second entry point (for example `app/admin_app.py`) that mounts only the admin and login routers and the session middleware; take those routers and the
middleware out of `app/main.py`, so that the public process answers `GET` only; and route `/api/admin` and `/api/auth` to the admin process in the web server. Two things to watch: both
processes must see the same `media/` folder (the admin writes the photos, the public process serves them), and the session secret belongs to the admin process only unless something
public ever needs to know who is logged in. The database, the models and the services are shared as they are; it is still one backend, in one repository.

### Who may do what

What a user may do is what their **grants** say (`user_grants`); no code checks a name or a role. A grant is an area of the content, and for `theme` the theme it is about, or every theme
(the ones added later included):

| Area | What it allows |
|---|---|
| `people_add` | add a new person |
| `people_edit` | change any person (title, photo, links) and let a person leave |
| `site` | collaborators and joint projects, the footer's numbers, the intro paragraphs of the People and Collaborations pages |
| `projects` | the funded projects of every theme, and the funded-projects paragraph of each theme page |
| `theme` | a theme's content: its words, research areas and topics, highlight cards, contacts |
| `accounts` | make accounts, switch them off, give grants |

Three kinds of people keep the site, and an account made with a preset gets that bundle of grants:

| Preset | Who | Grants |
|---|---|---|
| `administrative` | the administrative staff | `people_add`, `people_edit`, `site`, `accounts` |
| `theme-owner` | the one person who keeps every theme page | `people_add`, `theme` (every theme) |
| `projects-owner` | the one person who keeps the funded projects | `projects` |

An account made without a preset can log in and may do nothing.

### Rules kept in the services (`app/services/people.py`), so that no way in can skip them

- A person is **never deleted** (that would also remove them from the topics and contacts of every theme). One who leaves gets the title "Former member".
- When a person becomes a Former member they are **taken out of every theme's "Refer to" contacts** (a theme left with none shows no Refer to section). They stay among the "Involved
  people", where their title now reads Former member. The admin first shows which themes lose a contact and asks to confirm.
- A user who **added a person may correct that entry for 24 hours**; after that only those with `people_edit` can.
- A **photo needs the confirmation that the person agreed to it**; who confirmed it and when is kept (`people.photo_consent_by_id`, `photo_consent_at`). The file is checked by its
  content, shrunk, stripped of its EXIF data and stored under a name made from the person's slug; SVG is refused.
- Adding a person whose **name is already there** (capitals, accents and the order of the words do not count) is refused until the user confirms it is someone else.
- Text fields hold plain text (no `<` or `>`); a web address must start with `http://` or `https://`.
- Every change writes a row in `audit_log` (who, what, before and after) in the same transaction as the change; a change that fails leaves neither.

Rules for accounts (`app/services/accounts.py`):

- A new account, and one given a new password, gets a **temporary password** (such as `k7mq-x3ah-p9tw`, without letters that look alike). It is in the answer once and nowhere else: the
  database keeps only its hash and the audit log never holds a password. Until it is changed, the user can only change it (`POST /api/auth/change-password`), ask who they are and log
  out; every route of the admin answers 403 `password_change_required`.
- A password is changed by giving the current one (wrong tries count against the same lock as a login) and a different new one. Every other login of the user ends; this one goes on.
- A user cannot switch off, change the grants of or reset the password of their **own** account, and **at least one active account that may manage accounts** is always left.
- Switching an account off ends its logins at once; a reset also lifts a lock after wrong tries.

### What the admin's routes offer so far

All need a login, and the ones that change something also pass the cross-site check. Refusals come as `{"detail": {"code": ..., "message": ...}}`.

| Route | Does |
|---|---|
| `GET /api/auth/me` | who is logged in, their grants and whether they must change a temporary password |
| `POST /api/auth/change-password` | the user's own new password (`current_password`, `new_password`) |
| `GET /api/admin/accounts` | the accounts, with their grants, preset and state (grant `accounts`) |
| `POST /api/admin/accounts` | make an account (`email`, `name`, `preset`); the answer holds the temporary password |
| `PATCH /api/admin/accounts/{id}` | change the name, the preset (null: no grants) or `is_active` |
| `POST /api/admin/accounts/{id}/reset-password` | a new temporary password, in the answer once |
| `GET /api/admin/people/{slug}` | a person, and whether this user may change them (`can_edit`, `editable_until`) |
| `GET /api/admin/people/{slug}/leave-preview` | the themes that would lose this person as a contact |
| `POST /api/admin/people` | add a person (form data: `name`, `title`, `card_name`, `polito`, `orcid`, `linkedin`, `dept`, `iris`, `photo`, `photo_consent`, `confirm_distinct`); 409 `possible_duplicate` |
| `PATCH /api/admin/people/{slug}` | change what is sent (`clear` names optional fields to remove); a title of Former member needs `confirm_leave` (409 `leave_needs_confirmation` first) |

### Still to build

- The admin's own interface, as a separate front-end application (see above), showing each user only the tasks their grants allow, with screens for the people and accounts routes above.
- The themes' content, the funded projects (after a change to the projects the admin asks whether the theme page's funded-projects paragraph needs updating), the
  collaborators, the footer's numbers and the intro paragraphs.
- A scheduled check of the links in the content. A link is reported only after several failures in a row, the checker may only fetch `http` and `https` addresses and never one on a
  private network, and each user sees the broken links of the content they keep: project links the projects owner, collaborator and people links the administrative staff, highlight
  links the theme owner.
- A "I cannot find what I need" request, for edits that no screen covers.
- Rare edits outside the screens: a restricted expert mode for the administrative staff (the validation sits in the models and services, so it cannot be skipped there either); new fields
  and new themes stay developer work.
- **New theme:** a developer builds its particle cloud, models and header artwork and redeploys the front end; the theme owner then adds the theme's own text in the admin and ticks `published`. The theme list becomes the code's templates (`src/themes.js`: slug, colour, artwork) joined by slug to the database's content. Nothing is copied from another theme, and no code or particle bundle is ever uploaded through the admin.
- **Highlight cards** (paper and project): everything on them - title, authors, venue, keywords, text, link, picture - is entered by hand; nothing is read from IRIS.
- **Fields the admin forms add for accessibility** (to be added with the forms, with a migration):
  - `image_alt` on `highlights` (and on any picture the admin later takes): the picture's text alternative. Empty means the site writes one from the title, as it does today; a decorative picture can be marked so, and a screen reader then skips it.
  - `language` on projects (and on any text that is not English, such as the Italian project names): an ISO code such as `it`, which the site writes as `lang="it"` on that text so a screen reader pronounces it right. Empty means English.
- **Accessibility of the admin itself:** keyboard and screen-reader behaviour is to be tested; the login session must warn before it ends, so a form half filled is not lost.

## Migrations

After changing a model in `app/models/`:

```bash
.venv/Scripts/alembic revision --autogenerate -m "what changed"
.venv/Scripts/alembic upgrade head
```

`docker compose down` stops the database and keeps its data; `docker compose down -v` deletes the data too.
