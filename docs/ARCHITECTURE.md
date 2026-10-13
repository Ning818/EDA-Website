# Architecture

How the site is put together, in the order you will meet things.

## 1. The shape of the site

| Route                                   | Page file                    | What it shows                                                      |
| --------------------------------------- | ---------------------------- | ------------------------------------------------------------------ |
| `/`                                     | `src/pages/Home.jsx`         | the scroll story: brain, then one particle cloud per research theme, then social media |
| `/research`, `/research/:theme`         | `src/pages/Research.jsx`     | one Research page per theme (VLSI-CAD lives at `/research`)        |
| `/research/funded-projects[/:theme]`    | `src/pages/FundedProjects.jsx` | one Funded Projects page per theme                               |
| `/collaborations`                       | `src/pages/Collaborations.jsx` | logo grids over a particle globe                                 |
| `/teaching`                             | `src/pages/Teaching.jsx`     | people, with a sidebar to switch group                             |
| `/dev/effects` (dev server only)        | `src/pages/dev/DevEffects.jsx` | preview of the header artworks                                   |

The routes are in `src/App.jsx`. Header and footer wrap every page.

## 2. Content is data, not markup

All text, people, projects, logos, numbers and links live in `src/content/` as plain JavaScript modules with no JSX and no
React. A page imports what it shows; it does not contain it. Because the modules are plain data they can also be read by
Node scripts (the content check) and, later, by tools.

| File                 | Holds                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------- |
| `people.js`          | professors, the Teaching groups, the people listed on the Research pages                |
| `research.js`        | per theme: intro, topics, highlight thesis, funded-projects teaser                      |
| `projects.js`        | per theme: ongoing and ended projects, the highlight project; the counts shown in the stats |
| `collaborations.js`  | intro and the university / institute / company logos                                    |
| `home.js`            | the home hero and one paragraph per theme                                               |
| `site.js`            | footer (address, links, copyright)                                                      |
| `social.js`          | the YouTube and LinkedIn texts and links (used by the sections and by the home canvas)  |

Images are referenced as `new URL('../assets/images/...', import.meta.url).href` so Vite hashes and bundles them. The path is
written out literally on purpose: a path built from a variable would not be seen by the bundler.

Per-theme content is keyed by the theme's `slug` (`vlsi-cad`, `bioinformatics`, `smart-city`, `industry-4-0`). Three themes still
show the VLSI-CAD texts as placeholders; the content check lists them.

## 3. Themes

`src/themes.js` is the list of the four research themes. Each has a `slug`, a `name`, the paths of its two pages, a `color`, and a
`header`: the key of the artwork drawn in the header of its Research and Funded Projects pages. `color` is passed to that artwork
and to the page's CSS (`--theme`).

The home page keeps its own ordered list of the same four themes in `src/pages/Home.jsx` (with scroll lengths and which side
the cloud sits on). If a theme is added or renamed, change both.

## 4. Two particle systems

The site has two unrelated particle systems. Knowing which one you are touching is most of the job.

### 4a. The home page: one WebGL canvas (`src/three/`)

* `ParticleCanvas.jsx` (about 1,200 lines) is a single fixed, full-screen react-three-fiber `<Canvas>`. It is mounted once by
  `Home.jsx`. Text sections scroll over it; the particles do not scroll with the sections but are driven by scroll progress.
* Each cloud is a set of points built from a model file in `public/models/` (a GLB mesh, or a DXF line drawing parsed by
  `parseDXF.js`) by a builder in `<Name>Particles.jsx`: `buildBrainCloud`, `buildVLSICloud`, `buildDNACloud`, `buildCityCloud`,
  `buildArmCloud`, `buildSocialMediaCloud`. The builder file also holds that cloud's look: target size, particle spacing,
  particle size, colours, orientation.
* Where a cloud sits on screen comes from an invisible DOM anchor (`data-cloud="..."`) rendered by `<Name>Scene.jsx` inside the
  theme's section. Only the anchor's horizontal position and size are used live. On a phone the CSS variables
  `--fw/--fh/--fx/--fy` of `.phone-cloud` (see `index.css`) fit the cloud into the space the copy leaves.
* The transitions (brain to VLSI-CAD to DNA to Smart City to arm to social) are wired by hand in `ParticleCanvas.jsx`: one
  `anim*` ref and one GSAP timeline per pair, particles matched from one shape to the next by `morphMatch.js`. Scroll lengths
  are in `Home.jsx` (`dwell`, `gap`) and have to agree with the timeline constants in `ParticleCanvas.jsx` (see the comments
  at both places).
* `cloudState.js` shares a little state with the DOM (phone layout, brain position).

This system is **not** registry-based. Changing a cloud's look is easy; adding a cloud means touching a known list of places
(see [HOW-TO-ADD-AN-EFFECT.md](HOW-TO-ADD-AN-EFFECT.md)).

### 4b. The inner pages: a small Canvas 2D engine (`src/components/sections/`)

* `flatParticles.js` is the engine. A picture is a list of particles; each is either a **stream** (it flies out along a path
  and settles at its place on it) or a **gather** (it flies in from a scattered position). After the intro the particles
  twinkle, whole objects can move with a shared *motion* (a gear turning, a cloud drifting), and `drawExtras` draws anything
  else (moving highlights, glows). Reduced motion gets the finished picture. The loop pauses off screen and drops to 30 fps
  after the intro.
* An artwork is one component plus one geometry file: `HelixParticles.jsx` + `helixGeometry.js`, `SkylineParticles.jsx` +
  `skylineGeometry.js`, `FactoryParticles.jsx` + `factoryGeometry.js`. The circuit (`HeaderDecor.jsx`) predates the engine and
  draws on a canvas by itself. `HelixDecor`, `SkylineDecor`, `FactoryDecor` are the same pictures in thin SVG lines; no theme
  uses them now, they are kept as the reference the particle versions were made from.
* `GlobeParticles.jsx` (Collaborations) and `NetworkParticles.jsx` (Teaching) are their own canvases, not header artworks and
  not in the registry.

## 5. The header-effects registry

`src/effects/headerEffects.js` maps a key (`circuit`, `helix-particles`, `skyline-particles`, `factory-particles`, and the
legacy `helix`, `skyline`, `factory`) to its component, its two looks, the file to edit and the function that turns
`{ color, page, light }` into props.

```
themes.js  header: 'helix-particles'
      |
      v
Research.jsx / FundedProjects.jsx   <PageIntroBand decorVariant={theme.header} decorColor={theme.color} decorPage="research" />
      |
      v
PageIntroBand.jsx   headerEffectFor(key)  ->  <effect.component {...effect.props({ color, page, light })} />
```

To use another artwork for a theme, change one word in `themes.js`. To add an artwork, add one entry to the registry.

## 6. Layout of the source tree

```
src/
  App.jsx                routes
  themes.js              the four themes
  content/               data (section 2)
  effects/               header-effects registry (section 5)
  pages/                 one file per route, pages/dev/ = dev-only
  components/
    layout/              Header, Footer
    sections/            page sections + the 2D artworks and their engine
  three/                 the home page's WebGL clouds (section 4a)
  assets/images/         photos, logos, project images
public/models/           GLB / DXF model files of the clouds
scripts/                 the automatic checks
docs/                    these documents
```

## 7. Build and checks

* `npm run dev` serves with hot reload; `import.meta.env.DEV` is true, which is what mounts `/dev/effects`.
* `npm run build` writes `dist/`; the dev-only page is removed from it.
* `npm run check` and `.github/workflows/ci.yml` (see the README). The check scripts load the real source through a Vite server
  in middleware mode (`scripts/lib/vite-load.mjs`), so JSX and image imports work in Node.

## 8. Things worth knowing

* **Both particle systems are tuned by eye.** Numbers such as spacings, sizes, orientations and scroll lengths have no formula
  behind them; the comments say what each does and where it was measured against.
* **The home page has no automatic test.** WebGL needs a browser. After a change in `src/three/`, scroll the whole page on
  desktop and on a phone-sized window.
* **Mobile is a second layout, not just a smaller one**: the home clouds are re-fitted (`.phone-cloud`) and several header
  artworks have their own `max-md:` placement; check both when you change an effect's size.
