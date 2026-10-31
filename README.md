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

## Adding a research theme

A theme is both **code** (its look and its place in the home page's animation) and **content** (its words, research areas, projects and people). The code is the developer's work and is never
uploaded through the admin; the content is written by the staff in the admin. The order below lets the content be written before the public can see anything:

1. **Make the theme in the database** (the developer, backend folder):

   ```bash
   python -m app.manage create-theme --slug smart-grid --name "Smart Grid" --short-name "Smart Grid" --home-summary "The paragraph beside the particle cloud on the home page."
   ```

   `--slug` is its address and its key in the code (lower-case letters, digits and hyphens). Without `--intro` and `--funded-blurb` a placeholder is written, because neither may be empty.
   `--position 2` puts it third instead of last. The command writes a row in the activity log. The theme starts **off the website**: the public routes do not know it (`/api/themes` does not list it and
   `/api/themes/<slug>` answers 404, so what the staff write cannot be read by anyone before it is ready), and the admin marks it "Not on the website yet".

2. **Tell the people who keep the content** that the theme exists and that the website does **not show it yet**, which is as intended. In the admin they then write:
   - the theme owner (who has every theme, the new one included): its name, home-page paragraph, introduction, research areas, topics, involved people, contacts and the two highlight cards;
   - the administrative staff: the people who belong to it (a person is added with the "Research area" it is listed under);
   - the projects owner: its funded projects and the Guided Introduction.

   Nothing of this is visible to visitors yet.

3. **Make the theme in the front end** (the developer, `frontend/`). This is what takes days, and it needs the content's words to be final enough to show:
   - add its entry to `src/themes.js`: slug, colour, header artwork, the addresses of its Research and Funded Projects pages, and the **default** name, short name and home-page paragraph. The
     defaults are what the site shows until the API answers, or if it cannot be reached, and when the theme's home-page paragraph is empty in the database, so they must be real, presentable words;
   - build its particle cloud and its header artwork;
   - add its step to the home page: its entry in `src/pages/Home.jsx` and its transition in `src/three/ParticleCanvas.jsx` (the clouds follow one another along one scroll timeline, so the
     scroll length and the camera of the neighbouring steps are touched too); the chapter index and the navigation follow `themes.js`;
   - test it (`npm run build`, then look at the home page with the animation, with reduced motion and on a phone, and at both of the theme's pages).

4. **Release the front end, and put the theme on the website** (the developer): deploy the front end, then run

   ```bash
   python -m app.manage set-theme-live --slug smart-grid
   ```

   The theme goes live with its content already written, and the admin stops marking it. Both steps are needed: the command makes the API serve the theme, and the front end draws it only
   with its template in `themes.js`.

To take a theme off the site, the developer runs `python -m app.manage set-theme-live --slug smart-grid --off` and removes its template and its step from the front end; the content stays in the
database. The website always keeps at least one theme: the last one on it cannot be taken off.
