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
| `GET /api/site/social` | the two social media blocks of the home page, YouTube then LinkedIn: `label`, `text`, `cta` (the words of the button) and `url` (where the button and the footer's icon lead) |
| `GET /api/pages/{slug}` | the fixed paragraph under the title of a page that is not a theme's: `people` (the Collaborations page's comes with `/api/collaborations`) |
| `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | log in with an email and a password, log out, who is logged in (see "Accounts and login") |
| `GET /media/...` | the files: people's photos (`/media/people/`), the collaborators' logos (`/media/collaborators/`) and the highlight cards' pictures (`/media/highlights/`) |

A person has a name (and `card_name`, the name as the small cards write it), a title (and `title_short`, the form for the small cards), a group, a photo address, the links they have (`polito`, `orcid`, `linkedin`, `dept`, `iris`) and `page_url` / `page_kind`, the page a small card links to: the polito.it staff page, else the research profile on IRIS. The group follows from the title. Wherever the API lists people for the small cards (a research area, the people to refer to) they come ranked: full professors first, then associate and assistant professors, research fellows, PhD students and former members, and within a rank in the order they were written.

What a theme looks like (its colour, the artwork in its page headers, its addresses) stays in the site's code (`frontend/src/themes.js`); what it says is here - including its name. The code holds default names and paragraphs too (`frontend/src/themes.js`), which the site shows until the API answers or if it cannot be reached; the last answer is kept in the visitor's browser, so a repeat visit shows the current words at once. A theme the API lists that the code has no template for is not shown: the code decides which themes the site can draw.

## How the site reaches the API

In development the pages ask their own address for `/api/...` and `/media/...`; the Vite dev server (`frontend/vite.config.js`) forwards both to the API on port 8001. So a phone or an iPad on the same Wi-Fi needs only the page's address (`http://<this computer>:5173`), the API listens on this computer only, and there is no CORS to allow. In production the web server in front of the site must forward the same two paths to the API (`VITE_API_URL` points the site at an API on another address instead).

To work on the site, run both: `npm run dev` in `frontend/`, and the API (step 7 above). The People, Research, Funded Projects and Collaborations pages ask the API for what they show, and show a placeholder while it is on its way and a message with a "Try again" button when the API cannot be reached. The home page and the pages' structure and artwork do not depend on the API.

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

Only the phone and fax numbers are in the database (and where the LinkedIn and YouTube icons lead, which is the address of the home page's two social media blocks, `social_links`, seeded from the `social` part of this file); the rest of the footer (the names, the address, the "Visit" links, the icons themselves) is written in the code (`frontend/src/components/layout/Footer.jsx`). The footer is on every page and never waits for the API: the code keeps the same numbers as defaults (`src/site.js`), and the visitor's last answer is kept in the browser. A number that is empty leaves its line out of the footer. The "Department website" link in the code (www.dauin.polito.it/en/) did not answer when this was checked.

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
- the admin's people routes: who may add, correct, let a person leave and delete one, what is refused (HTML in a name, a `javascript:` link, a photo that is not a photo or has no consent, a name that is already there), what is kept (the photo without its EXIF data, who confirmed the consent, an audit row) and that a failed change leaves nothing behind;
- the admin's routes for the funded projects: who may (only the funded-projects owner), what is refused (HTML, a `javascript:` address, an unknown theme or status, a field nobody asked for), what the public pages show afterwards (the new project last in its list, the numbers, the ended list), that a project is never deleted and that the sentence about the projects is written only by hand;
- the admin's routes for the collaborators, the joint projects, the footer's numbers and the page paragraphs: who may (only the administrative staff), what is refused (HTML, a `javascript:` address, a file that is not a logo or an SVG, a name or code that is taken, a number that is not a phone number), what the public pages show afterwards, the logo files that are written and removed, and that a change that changes nothing is not recorded;
- the admin's routes for the theme pages: who may (the theme owner, and for one theme only whoever holds that theme's grant), what is refused (HTML, a `javascript:` address, a Former member as a contact, someone who is not in the People list, too many of anything, a file that is not a picture, a picture without its text alternative), what the public pages show afterwards, the files that are written and removed, and that a change that changes nothing is not recorded;
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
- **The login** is a signed cookie (`eda_session`): HttpOnly, SameSite=Lax, and Secure where `SESSION_COOKIE_SECURE=true` (set it wherever the site is served over HTTPS). It ends after 2 hours without a request, 12 hours after the login whatever happens, when the account is switched off or deleted, and when the password is changed. The login, `GET /api/auth/me` and the password change tell the admin how long it lasts (`session.idle_seconds` and `session.max_seconds_left`), so that it can warn before it ends; asking `me` is also a request, so it starts the idle time again. Visitors who only read the site get no cookie.
- **Wrong passwords:** after 5 wrong tries for an email the login is refused for 15 minutes, even with the right password. An email nobody has is counted the same, and a wrong email and a wrong password get the same answer, so nothing tells which accounts exist. The times and numbers are settings (`LOGIN_MAX_FAILURES`, `LOGIN_LOCK_MINUTES`, `SESSION_IDLE_MINUTES`, `SESSION_MAX_HOURS`).
- **Pages of other sites:** every route that changes something checks the request's `Origin` (`check_origin`): it must be the site's own address or one of `CORS_ORIGINS`, so another site cannot make a logged-in visitor's browser send it.
- Behind a reverse proxy the proxy must pass the `Host` header on (`proxy_set_header Host $host;`) and the API must be started with `--proxy-headers`. The same goes for a dev server: the admin's
  (`admin/vite.config.js`) forwards with `changeOrigin: false`, because Vite's short form of a proxy rewrites the `Host`, and the check above would then refuse every login.

## The admin

### Separate applications

The public website (the front end in `frontend/`), this API and the admin are three different, isolated applications. They may share one repository for simplicity, but each has
its own dependencies, build, settings and port, none imports another's code, and they meet only through this API's HTTP routes. The website only reads (`GET`); every change to the
content comes through the admin's routes (`/api/admin/...`), which the website never calls. The admin's interface is a front-end application of its own, in `admin/`, next to
`backend/` and `frontend/` and never inside the website's folder. `tests/test_architecture.py` keeps the API's side of this honest.

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
| `people_edit` | change any person (title, photo, links); a change of title to Former member is how a person leaves |
| `people_delete` | delete a person (for one added by mistake) |
| `site` | collaborators and joint projects, the footer's numbers, the intro paragraphs of the People and Collaborations pages |
| `projects` | the funded projects of every theme, and the funded-projects paragraph of each theme page |
| `theme` | a theme's content: its words, research areas and topics, highlight cards, contacts |
| `accounts` | make accounts, switch them off, give grants |

Three kinds of people keep the site, and an account made with a preset gets that bundle of grants:

| Preset | Who | Grants |
|---|---|---|
| `administrative` | the administrative staff | `people_add`, `people_edit`, `people_delete`, `site`, `accounts` |
| `theme-owner` | the one person who keeps every theme page | `people_add`, `theme` (every theme) |
| `projects-owner` | the one person who keeps the funded projects | `projects` |

The admin always gives an account one of these and never takes it away (an account that is not needed is switched off). Only the command line can make an account without a preset, which can log in and may do nothing.

### Rules kept in the services (`app/services/people.py`), so that no way in can skip them

- A person who has **left is not deleted** but gets the title "Former member". **Deleting is for someone added by mistake** and needs the grant `people_delete` (the administrative staff) - or being the
  user who added the person, for the day in which they may correct the entry. Deleting also removes the person from the "Refer to" contacts and the "Involved people" of every theme, so the
  admin first shows what will go (`delete-preview`) and the request has to say `confirm=true`, even where nothing else goes. What went is kept in the audit log (`person.delete`, with the
  themes and topic groups the person was in), and the photo file is removed. The name and its address are free to use again.
- When a person becomes a Former member they are **taken out of every theme's "Refer to" contacts** (a theme left with none shows no Refer to section). They stay among the "Involved
  people", where their title now reads Former member. The admin first shows which themes lose a contact and asks to confirm.
- A person can be **added straight into a research area** of a theme, as one of its "Involved people" (`topic_group_id`): that needs the grant `theme` for that theme (a grant for every
  theme covers all of them) as well as `people_add`, and the person goes last among the people of the area (the pages order them by rank first). A user who may not, or an area that does not
  exist, is refused and nothing is added; the audit row of the addition (`person.add`) says which area. `GET /api/admin/research-areas` lists the areas a user may choose from.
- A user who **added a person may correct or delete that entry for 24 hours**; after that only those with `people_edit` (to correct) or `people_delete` (to delete) can.
- A **photo needs the confirmation that the person agreed to it**; who confirmed it and when is kept (`people.photo_consent_by_id`, `photo_consent_at`). The file is checked by its
  content, shrunk, stripped of its EXIF data and stored under a name made from the person's slug; SVG is refused.
- Adding a person whose **name is already there** (capitals, accents and the order of the words do not count) is refused until the user confirms it is someone else.
- Text fields hold plain text (no `<` or `>`); a web address must start with `http://` or `https://`.
- Every change writes a row in `audit_log` (who, what, before and after) in the same transaction as the change; a change that fails leaves neither.

Rules for the funded projects (`app/services/projects.py`), which need the grant `projects`, for every theme:

- A project is **never deleted**: when it is over it is changed to `ended` and stays in the ended list. A wrong entry is corrected, and can be moved to the right theme.
- A new project goes **last** in its list (ongoing or ended), and so does a project that is moved to another theme or changes its status; the pages keep each list in the order of `position`.
  The numbers in the header of a theme's pages are counted from the projects, so they follow at once.
- A project is a theme, a status, a description and, if it has them, a code and an address. The description is plain text (at most 300 characters, never empty), the code is at most 50,
  the address is an `http` or `https` one; a code or an address sent empty is removed.
- The **sentence in the Funded projects card of a theme page** (`themes.funded_blurb`, for example "Ongoing projects include R2POWER300 and R3POWERUP, which work on ...") is written by hand by this
  owner (plain text, 1 to 600 characters). Nothing writes it from the projects. After a project is added, ended or changed, the admin asks the owner whether the sentence still fits; that
  question is the admin's, the API only offers `PUT /api/admin/themes/{slug}/funded-blurb`.
- A change that changes nothing writes no audit row. Ending a project is recorded as `project.end`, the other changes as `project.add` and `project.update`, and a new sentence as
  `theme.funded_blurb`.

Rules for the parts of the site the administrative staff keep (`app/services/collaborations.py` and `site.py`), which need the grant `site`:

- A **collaborator** is in one of the three walls (university, institute, company) and goes **last** in its wall; one whose kind is corrected goes last in the new wall. A wall cannot hold
  two with the same name (capitals do not count): 409 `name_taken`. The name is at most 200 characters of plain text and the address, if there is one, an `http` or `https` one.
- A collaborator **needs a logo**: it is required to add one (422 on `logo` without it), and a logo can be replaced but never taken away (`clear` takes only `url`). An entry from before this
  rule that has no logo can still be corrected without one. The logo is checked by its content, shrunk to at most 600 pixels, stripped of everything but the picture, kept as a PNG where it
  has transparent parts, and stored under a name made from the collaborator's name and the picture's hash (`media/collaborators/`); SVG is refused. A replaced logo, and the logo of a removed
  collaborator, is deleted.
- A collaborator can be **removed** (the collaboration ended, or it was added by mistake); what it was is kept in the audit log. Nothing else refers to a collaborator, because the other
  partners of a joint project are only names, as the project's record on CORDIS gives them.
- A **joint project** has a code that no other has (409 `code_taken`; capitals do not count), a name, funding, years, a coordinator and the address of its record (all required), and its other
  partners (up to 40 names, which need not be collaborators). It goes last in the list.
- The footer's **phone and fax numbers** are checked for being phone numbers (6 to 15 digits, with only spaces and `( ) . / -` between them and a `+` at the start), because a visitor dials
  the number with one tap. Either may be sent empty, and the footer then leaves that line out. The link that dials is made from the digits.
- The **paragraph under the title of the People and Collaborations pages** is plain text of at most 1000 characters and is never empty. Only a page that has a paragraph can be written.
- A change that changes nothing writes no audit row. The actions are `collaborator.add`, `.update`, `.delete`, `joint_project.add`, `.update`, `.delete`, `site.contact` and `page.intro`.

Rules for the theme pages (`app/services/themes.py`), which need the grant `theme` for the theme (a grant for every theme covers all of them):

- A theme's **words** are its name, short name, the paragraph beside its particle cloud on the home page and the introduction of its Research page: plain text, with limits (100, 50, 1000 and
  1000 characters). The colours and the drawing of the header are in the site's code and cannot be changed here, nor can the sentence about the funded projects, which is the funded-projects
  owner's.
- The **contacts** ("Refer to") are people of the People list, in an order; a Former member is refused, duplicates count once, there can be at most 12, and none at all is allowed (the section
  then disappears from the page).
- A theme has at most 12 **research areas** (a title of up to 200 characters), each with at most 15 **topics** (a line of up to 300) and at most 24 **involved people**, who are chosen from
  the People list and may include those who have left. Areas and topics go last where they are added and move up or down one place at a time; the pages show the people by rank first, and
  within a rank in the order they were chosen. Removing an area removes its topics and its involved people (the people stay in the People list), so it first shows what goes and needs
  `confirm=true`.
- The two **highlight cards** of a theme, a paper and a project, are typed by hand and written whole: a paper has a title, authors in full and in short form, a journal or conference, keywords
  (at most 8), a summary (at most 1200 characters) and an address; a project has a second line of the title in place of the authors and the venue. Nothing is read from IRIS. The picture is
  optional, is checked, shrunk to 1200 pixels and stored like the others (SVG is refused), and **needs a text alternative** (`highlights.image_alt`, 300 characters), which the public API
  sends and the website uses for the picture's `alt`; a replaced or removed picture is deleted.
- A change that changes nothing writes no audit row. The actions are `theme.words`, `theme.contacts`, `area.add`, `.update`, `.move`, `.delete`, `.people`, `topic.add`, `.update`, `.move`,
  `.delete` and `highlight.save`.

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
| `PATCH /api/admin/accounts/{id}` | change the name, the preset (it cannot be taken away; an account that is not needed is switched off) or `is_active` |
| `POST /api/admin/accounts/{id}/reset-password` | a new temporary password, in the answer once |
| `GET /api/admin/research-areas` | the research areas of the themes the user holds the grant `theme` for (`id`, `title`, `theme_slug`, `theme_name`), in the order of the site; none for a user without it |
| `GET /api/admin/people/{slug}` | a person, and whether this user may change them (`can_edit`, `editable_until`) |
| `GET /api/admin/people/{slug}/leave-preview` | the themes that would lose this person as a contact (the 409 of a title change to Former member carries the same list, which is what the admin's form uses) |
| `GET /api/admin/people/{slug}/delete-preview` | the contacts and topic groups that would lose this person if they were deleted (grant `people_delete`, or the one who added the person for a day) |
| `POST /api/admin/people` | add a person (form data: `name`, `title`, `card_name`, `polito`, `orcid`, `linkedin`, `dept`, `iris`, `photo`, `photo_consent`, `confirm_distinct`, `topic_group_id`); 409 `possible_duplicate` |
| `PATCH /api/admin/people/{slug}` | change what is sent (`clear` names optional fields to remove); a title of Former member needs `confirm_leave` (409 `leave_needs_confirmation` first) |
| `GET /api/admin/collaborators` | every collaborator, wall by wall in the order of the page (grant `site`) |
| `GET /api/admin/collaborators/{id}` | one collaborator |
| `POST /api/admin/collaborators` | add a collaborator (form data: `kind`, `name`, `logo` (required), `url`); it goes last in its wall; 409 `name_taken` |
| `PATCH /api/admin/collaborators/{id}` | change what is sent (`clear` names what to remove: only `url`); a new `logo` replaces the old one, and a logo cannot be taken away |
| `DELETE /api/admin/collaborators/{id}` | remove a collaborator and its logo file |
| `GET /api/admin/joint-projects` | the joint projects in the order of the page |
| `GET /api/admin/joint-projects/{id}` | one joint project |
| `POST /api/admin/joint-projects` | add one (JSON: `code`, `name`, `funding`, `years`, `coordinator`, `url`, `partners`); 409 `code_taken` |
| `PATCH /api/admin/joint-projects/{id}` | change what is sent (JSON) |
| `DELETE /api/admin/joint-projects/{id}` | remove a joint project |
| `PATCH /api/admin/site/contact` | change the footer's numbers (JSON: `phone`, `fax`; only what is sent changes, null or empty removes one); the answer is what `GET /api/site` gives |
| `PUT /api/admin/site/pages/{slug}` | write the paragraph under the title of the `people` or `collaborations` page (JSON: `intro`) |
| `PUT /api/admin/site/social/{slug}` | write one social media block of the home page, `youtube` or `linkedin`, whole (JSON: `label`, `text`, `cta`, `url`; grant `site`); 404 `social_not_found` for any other |
| `GET /api/admin/projects` | every project of every theme with its theme, in the order of the site (grant `projects`) |
| `GET /api/admin/projects/{id}` | one project |
| `POST /api/admin/projects` | add a project (JSON: `theme` as a slug, `description`, and if wanted `status`, `code`, `url`); it goes last in its list |
| `PATCH /api/admin/projects/{id}` | change what is sent (JSON: `theme`, `status`, `description`, `code`, `url`; a `code` or `url` sent as null or empty is removed); a project that is over gets `status` ended |
| `GET /api/admin/themes` | the themes the user may keep (grant `theme`), in the order of the site; none without the grant |
| `GET /api/admin/themes/{slug}` | everything of a theme that the theme owner keeps: words, research areas with their topics and involved people (with the ids the other routes take), contacts, highlight cards |
| `PATCH /api/admin/themes/{slug}` | change the words (JSON: `name`, `short_name`, `home_summary`, `intro`); the optional two sent as null or empty are removed |
| `PUT /api/admin/themes/{slug}/contacts` | the contacts, in order (JSON: `people`, a list of addresses from the People list) |
| `POST /api/admin/themes/{slug}/areas` | add a research area (JSON: `title`); it goes last |
| `PATCH /api/admin/areas/{id}` | rename an area (JSON: `title`) |
| `POST /api/admin/areas/{id}/move` | move an area one place (JSON: `direction`, `up` or `down`) |
| `GET /api/admin/areas/{id}/delete-preview` | what removing the area takes with it: the number of topics and of involved people |
| `DELETE /api/admin/areas/{id}?confirm=true` | remove an area with its topics and its involved people; without `confirm` it answers 409 `delete_needs_confirmation` with what would go |
| `POST /api/admin/areas/{id}/topics` | add a topic (JSON: `text`); it goes last |
| `PUT /api/admin/areas/{id}/people` | the involved people of the area, in order (JSON: `people`) |
| `PATCH /api/admin/topics/{id}`, `POST /api/admin/topics/{id}/move`, `DELETE /api/admin/topics/{id}` | change a topic (JSON: `text`), move it one place, remove it |
| `PUT /api/admin/themes/{slug}/highlights/{kind}` | write the highlight card `paper` or `project` (form data: `title`, `text`, `url`, `tags`, for a paper `authors_full`, `authors_short`, `venue`, for a project `subtitle`, and `image`, `image_alt`, `remove_image`) |
| `PUT /api/admin/themes/{slug}/funded-blurb` | write the sentence of the theme's Funded projects card about its own projects (JSON: `text`) |
| `GET /api/admin/links/problems` | the links in the content the user keeps that failed the threshold number of checks in a row, longest broken first, with the time of the last check and the threshold; none for a user who keeps nothing with links |
| `POST /api/admin/links/problems/{id}/check` | check that one link again now: a good answer clears the report, a bad one counts as one more failure; 403 `not_allowed` for a link of content the user does not keep, 404 `link_not_found` when the address was changed or removed meanwhile |
| `POST /api/admin/requests` | say what you could not find or do (JSON: `message`, and `page`, the admin page you came from); any logged-in user with at least one grant, at most 5 waiting at once (409 `too_many_open`) |
| `GET /api/admin/requests/mine` | the user's own requests with their answers, newest first |
| `GET /api/admin/requests` | every request, the waiting ones first (grant `system`, the developer's) |
| `POST /api/admin/requests/{id}/close` | mark one as answered, with an answer if wanted (JSON: `answer`; grant `system`); 409 `already_done` the second time |
| `GET /api/admin/audit` | the activity log, newest first, a page at a time (`limit` up to 200, `before` the id of the last entry seen, `action` the start of an action such as `person.`, `user` part of an email); each entry has who, when, the action, what it was done to and the values before and after; the answer also lists every action the log holds (grant `system`) |
| `GET /api/admin/system` | how the system is doing: the database and its migration version, the link check (last run, counts, whether it is stale), the uploaded files, the accounts, the requests waiting and the size of the content (grant `system`) |
| `DELETE /api/admin/people/{slug}?confirm=true` | delete a person added by mistake (grant `people_delete`, or the one who added the person for a day); without `confirm` it answers 409 `delete_needs_confirmation` with what would go |

### The check of the links in the content (`app/services/links.py`)

`python -m app.manage check-links` visits every link kept in the content (the links of the people, the collaborators, the joint projects, the funded projects and the highlight cards) and
prints how many work, how many failed this time, how many could not be checked, and how many are reported. It is meant to run from the host's scheduler once a day, for example
`python -m app.manage check-links` from cron, or as a Windows Task Scheduler task; the application itself starts no background work.

- **Reported only after several failures in a row** (`LINK_FAIL_THRESHOLD`, 3 by default): a site that is down for a night does not raise an alarm, and one good answer starts the count again.
- **Sites that refuse programs** (answers 401, 403, 406, 429 and 999) are marked "blocked" and never reported: the check cannot tell whether a person would reach them.
- **The checker is not a way into the private network.** It fetches `http` and `https` addresses only, asks for the address's name itself and refuses any that resolves to a private, loopback,
  link-local or otherwise non-public address, connects to the address it checked (so the name cannot be changed between the check and the connection), follows at most 5 redirects and checks
  each one the same way, reads only the status, and gives up after `LINK_TIMEOUT_SECONDS` (10).
- **Each address is fetched once** even when several places use it; the answer is kept for all of them.
- **Each user sees the links of the content they keep**: people's links the holders of `people_edit`, collaborators and joint projects the holders of `site`, funded projects the holders of
  `projects`, highlight cards the holders of `theme` (for that theme). A link whose address was changed or removed after the check is not shown, and the next check starts it again.
- The list is read-only; a user may check one link again (`POST .../check`), and the answer is the same as the scheduled check would give.

### The "I can't find what I need" requests (`app/services/requests.py`)

For an edit that no screen covers, a user writes what they need (`help_requests` table). Only the developer can build or change what a screen does not, so the requests go to them: the
holder of the grant `system` (the preset `developer`, which has nothing else) reads them and closes each with an answer that the user reads in the admin. Any logged-in user with at least one grant may ask (an account with no grants may do nothing in the admin); a request is plain text of at most 1500 characters, comes with the admin page it was
written from (a path only, never an address of another site), and at most 5 of one user wait at once. Asking and closing write audit rows (`request.create`, `request.close`); a
closed request cannot be answered again, and a request stays readable after its account is gone. Nothing is sent by email: the developer sees the waiting ones on their Home page. The first developer account is made from the command line:
`python -m app.manage create-user --email ... --name ... --preset developer`.

### What the developer sees (`app/services/system.py`)

The preset `developer` has one grant, `system`, and it only reads and answers: the requests (above), the activity log and the status of the system. None of them changes content.

- **The activity log** is the `audit_log` table, which every change of the admin writes in the same transaction as the change, so that nothing changed is missing from it and nothing is in it that was
  rolled back. It is read newest first, a page at a time by the id of the last row seen (a row written meanwhile cannot move the next page). A filter on the start of an action or on part of an
  email is never read as a pattern. It never holds a password or its hash (a test reads a whole log after accounts were made and reset).
- **The status** reports the database (and says so when it does not answer, instead of failing), the version of the tables, the link check, the size of the uploaded files, the accounts and the
  requests waiting. The link check is called **stale** when it has not run for `LINK_CHECK_STALE_DAYS` days (3 by default) or never: it is run by the host's scheduler, and nothing else would
  notice that the scheduler stopped. The developer's Home page shows that, and the requests waiting. The links are also counted **by who keeps them** (the people's links, the collaborators
  and joint projects, the funded projects, the highlight cards): how many there are, how many failed the last check and how many are reported, with the names of the active accounts that hold the
  grant for each kind, so that a failing link that no account is there to mend can be seen.

### Making a theme

`python -m app.manage create-theme --slug <slug> --name <name> [--short-name ...] [--home-summary ...] [--intro ...] [--funded-blurb ...] [--position N]` makes a theme with the words given (a placeholder for
an introduction and a funded-projects sentence left out, which may not be empty), with no areas, contacts, cards or projects. It goes last unless `--position` puts it earlier, and it starts **off the website** (`themes.on_site` false): `GET /api/themes` leaves it out and `GET /api/themes/{slug}` answers 404, while the admin still
lists it, marked, so that the staff can write it before anyone can read it. `python -m app.manage set-theme-live --slug <slug>` puts it on the website when its template is in the front end's code (`--off`
takes it off; the last theme on the site cannot be taken off), and both write a row in the activity log. The slug is lower-case
letters, digits and single hyphens, at most 50 characters, and not one that is taken. The theme owner, whose grant covers every theme, can write it in the admin at once. It is the only way to make a
theme: no admin screen does, because a theme also needs code (see the root README).

### Still to build

- The admin's own interface is a separate front-end application (`../admin`) that shows each user only the tasks their grants allow; its README lists the screens that exist and the ones still to build.
- Rare edits outside the screens: a restricted expert mode for the administrative staff (the validation sits in the models and services, so it cannot be skipped there either); new fields
  and new themes stay developer work.
- **New theme:** made by the developer with `python -m app.manage create-theme`, written in the admin by the staff, and shown on the website only when its template is added to the front end's code (`frontend/src/themes.js`); the steps are in the [root README](../README.md#adding-a-research-theme). The code's templates (slug, colour, artwork) are joined by slug to the database's content; a theme in the database that has no template is not shown. Nothing is copied from another theme, and no code or particle bundle is ever uploaded through the admin, and the switch is `themes.on_site`, which the developer sets together with releasing the template.
- **Fields the admin forms add for accessibility** (both done, each with a migration): `image_alt` on the highlight cards (a picture needs one; a card saved before has none, and the site then
  writes one from the title), and `language` on projects: the ISO 639-1 code of the description (`it`; none means English), which the site writes as `lang="it"` on that text so a screen reader
  pronounces it right. The languages on offer are `LANGUAGES` in `app/services/projects.py` (Italian, French, German, Spanish; a code that is not in it is refused, English is sent as null or `en`),
  and the admin's list in `admin/src/labels.js` is kept the same. The ten projects whose description the group's pages give in Italian are marked in the seed and by the migration. Only the
  description has a language: a code is an acronym, and the other texts are English.
- **Accessibility of the admin itself:** keyboard and screen-reader behaviour is still to be tested by hand.

## Migrations

After changing a model in `app/models/`:

```bash
.venv/Scripts/alembic revision --autogenerate -m "what changed"
.venv/Scripts/alembic upgrade head
```

`docker compose down` stops the database and keeps its data; `docker compose down -v` deletes the data too.
