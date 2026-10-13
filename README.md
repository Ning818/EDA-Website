# EDA Group website

The website of the EDA Group (Politecnico di Torino): a home page whose scroll is a story told by 3D particle clouds, and inner
pages (Research, Funded Projects, Collaborations, Teaching) with their own 2D particle artwork.

Stack: Vite 8, React 19, react-router 7, Tailwind CSS 4, three.js with @react-three/fiber (home page), GSAP (scroll timeline),
and a small Canvas 2D particle engine of our own (inner pages).

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run check      # lint + content + effects + page render + production build; run it before every commit
npm run build      # production build into dist/
```

Node 20 or newer.

## Where do I start?

| I want to ...                                                       | Read                                                          |
| ------------------------------------------------------------------- | ------------------------------------------------------------- |
| change a text, a person, a project, a logo, a link                  | [docs/HOW-TO-EDIT-CONTENT.md](docs/HOW-TO-EDIT-CONTENT.md)   |
| change how a particle effect looks or moves                         | [docs/HOW-TO-MODIFY-AN-EFFECT.md](docs/HOW-TO-MODIFY-AN-EFFECT.md) |
| add a new particle effect (a page header artwork or a home cloud)   | [docs/HOW-TO-ADD-AN-EFFECT.md](docs/HOW-TO-ADD-AN-EFFECT.md) |
| understand how the site is put together                             | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                  |
| take the site over from the previous maintainer                     | [docs/HANDOFF-CHECKLIST.md](docs/HANDOFF-CHECKLIST.md)        |

## The three places that matter

```
src/content/    every text, name, number, link and image reference shown on the site (plain data, no JSX)
src/themes.js   the four research themes: slug, colour, pages, and which header artwork each uses
src/effects/    the registry of the page-header artworks (headerEffects.js)
```

Everything else is the code that draws them: `src/pages/` (one file per page), `src/components/` (sections and the 2D artworks),
`src/three/` (the home page's WebGL clouds). 3D model files are in `public/models/`.

## Preview an effect on its own

With the dev server running, open <http://localhost:5173/dev/effects>: every registered header artwork, in both of its looks, in
any theme colour, with a Replay button. This page exists only in the dev server, not in the built site.

## Checks

`npm run check` runs, in order:

1. `npm run lint` - oxlint (warnings that were there before are known; errors fail),
2. `npm run check:content` - every theme has its texts, required fields exist, every image file exists, every link is a valid URL,
3. `npm run check:effects` - every theme's header artwork is registered and every registered effect renders in both looks,
4. `npm run check:pages` - every inner route renders with its title and artwork,
5. `npm run build`.

The same runs on GitHub for every push and pull request (`.github/workflows/ci.yml`). The home page is a WebGL scene and is
not covered by an automatic check; look at it in a browser after touching `src/three/`.

Warnings printed by the content check are the list of placeholders that still have to be filled with real content.
