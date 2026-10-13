# How to modify an existing effect

There are two kinds of effects; find yours first.

| You see it on ...                                              | It is a ...              | Section |
| -------------------------------------------------------------- | ------------------------ | ------- |
| the right of the title band of a Research / Funded Projects page | header artwork (2D)     | 1       |
| the home page, scrolling (brain, chips, DNA, city, arm, logos)  | home cloud (3D, WebGL)   | 2       |

Do not mix them up: they share no code. See [ARCHITECTURE.md](ARCHITECTURE.md) section 4.

---

## 1. A header artwork

### The loop

1. `npm run dev`, open <http://localhost:5173/dev/effects>. Every artwork is there, drawn the way its page draws it, with
   buttons for the page (`research` / `projects`), the theme colour, and **Replay** (plays the intro again).
2. Open the effect's file (the registry in `src/effects/headerEffects.js` names it in `source`, and its drawing data in
   `geometry`), change a number, save. The preview updates by itself.
3. Look at the real pages too (`/research/bioinformatics` and so on) at desktop and phone width.
4. `npm run check`.

### What lives where

| Artwork          | Registry key        | Drawing and behaviour                          | Shape data (coordinates)                       |
| ---------------- | ------------------- | ---------------------------------------------- | ---------------------------------------------- |
| VLSI-CAD circuit | `circuit`           | `components/sections/HeaderDecor.jsx`          | in the same file (`TRACES`, `LABELS`, ...)     |
| Bioinformatics   | `helix-particles`   | `components/sections/HelixParticles.jsx`       | `components/sections/helixGeometry.js`         |
| Smart City       | `skyline-particles` | `components/sections/SkylineParticles.jsx`     | `components/sections/skylineGeometry.js`       |
| Industry 4.0     | `factory-particles` | `components/sections/FactoryParticles.jsx`     | `components/sections/factoryGeometry.js`       |

### What to change for what you want

| You want ...                                  | Change                                                                                              |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| another main colour                           | the theme's `color` in `src/themes.js` (the second colour is `AMBER` at the top of the effect file) |
| denser or sparser dots                        | `SPACING` at the top of the effect file (smaller = denser; it also costs more per frame)            |
| bigger or smaller dots                        | the `r0` of the `stream(...)` / `gather(...)` calls (radius in picture units)                       |
| a faster or slower intro                      | the `delay` of each stream and the `T`/`D` of the particles; `RUN` is when things start to drift    |
| a different picture                           | the geometry file; the component draws whatever the geometry gives it                               |
| where the amber goes on each page             | the `variant` logic at the top of `build()` (`research` / `projects` differ only there)             |
| where the artwork sits and how it is masked   | the `<canvas className=...>` at the bottom of the component (width, `max-md:` phone placement, the fade mask) |
| something that moves                          | a motion (see below) or `drawExtras`                                                                |

### How a picture is made (the 2D engine)

`flatParticles.js` documents its own API at the top; in short, a picture is `{ particles, traces, motions, colors, layout,
drawExtras }`:

* **traces** are SVG path strings turned into points once (`densePath(d)`).
* a **stream** particle leaves the start of its trace and settles at distance `s` along it (a line "grows"); a **gather**
  particle flies in from a scattered position (`ox`, `oy`) to its place. `T` is when it starts, `D` how long it takes.
* `c` picks the colour (0 or 1 of `colors`), `r` the radius, `a` the opacity.
* a **motion** is a function of time returning an affine matrix; particles that name the same motion (`mi`) move together
  (`translate`, `rotateAbout`, `compose` build them). Return `IDENTITY` before the motion starts.
* `layout(w, h)` says how the picture's units fit the canvas; `drawExtras(ctx, t, api)` draws moving highlights after the
  particles.

The skyline and factory files are the best examples to read; each is about 150 lines.

### Rules to keep when you change one

* Keep the canvas `aria-hidden` and `pointer-events-none`: it is decoration.
* Keep reduced motion working: the engine draws the finished picture once; do not start your own timers.
* Keep both pages (`research`, `projects`) working: the preview page shows both.
* Use `rng(seed)` from `flatParticles.js`, not `Math.random()`, so the picture is the same on every load.

---

## 2. A home cloud

A cloud's look is in its builder file in `src/three/`; where and when it appears is in `ParticleCanvas.jsx` and `Home.jsx`.

| Cloud           | Builder                     | Model (in `public/models/`)  | Anchor                | Look constants (top of the builder)                                                 |
| --------------- | --------------------------- | ---------------------------- | --------------------- | ----------------------------------------------------------------------------------- |
| Brain           | `BrainParticles.jsx`        | `brain.glb`                  | `BrainScene.jsx` (hero) | `TARGET_EXTENT`, `BRAIN_PARTICLE_SIZE`, `WHITE_FADE`                                |
| VLSI-CAD        | `VLSICADParticles.jsx`      | `chips.glb`                  | `VLSICADScene.jsx`    | `TARGET_EXTENT`, `EDGE_SPACING`, `MESH_SPACING`, `VLSI_PARTICLE_SIZE`, `CHIP_COLOR`, `VLSI_ORIENTATION` |
| Bioinformatics  | `DNAParticles.jsx`          | `dna6.dxf`                   | `DNAScene.jsx`        | `TARGET_EXTENT`, `EDGE_SPACING`, `DNA_PARTICLE_SIZE`, `DNA_COLOR`, `HIGHLIGHT_COLOR`|
| Smart City      | `SmartCityParticles.jsx`    | `smart-city13.dxf`           | `SmartCityScene.jsx`  | `TARGET_EXTENT`, `EDGE_SPACING`, `CITY_PARTICLE_SIZE`, `BUILDING_COLOR`, `ROAD_COLOR`, `CITY_ORIENTATION` |
| Industry 4.0    | `IndustryArmParticles.jsx`  | `industry-arm.glb`           | `IndustryArmScene.jsx`| `TARGET_EXTENT`, `EDGE_SPACING`, `ARM_PARTICLE_SIZE`, `ARM_COLOR`, `ARM_ORIENTATION`|
| YouTube / LinkedIn | `SocialMediaParticles.jsx` | `social-media-youtube2.dxf`, `social-media-linkedin.dxf` | none (placed by `ParticleCanvas.jsx`; `SocialCopy.jsx` is the text beside it) | colours per layer name, `SOCIAL_PARTICLE_SIZE`, `SOCIAL_SCALE_PX` (in ParticleCanvas) |

| You want ...                              | Change                                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| the cloud bigger / smaller                | `TARGET_EXTENT` (the model's size in scene units); or the anchor's `--fw/--fh` in its `*Scene.jsx` for how it fits the box |
| more or fewer particles                   | `EDGE_SPACING` / `MESH_SPACING` (smaller = more); keep an eye on frame rate                  |
| bigger dots                               | `*_PARTICLE_SIZE`                                                                            |
| other colours                             | the colour constants of the builder                                                          |
| the resting orientation                   | `*_ORIENTATION` (a quaternion; easiest to find by trial)                                     |
| the cloud elsewhere in its box            | its `*Scene.jsx`: `left`, `top`, `w-[..%]` on the `data-cloud` element; on a phone `--fx/--fy` |
| the paragraph or side of a theme          | `Home.jsx` (`imageSide`) and `src/content/home.js` (text)                                    |
| how long a stage holds / how long a transition scrolls | `dwell` and `gap` in `Home.jsx`; they must stay consistent with the timeline constants in `ParticleCanvas.jsx` (the comments at both places say how) |
| the model itself                          | replace the file in `public/models/` (same name, same layer / node names; see the builder's top comment for what it expects) |

The transitions between clouds are matched point by point (`morphMatch.js`), so a model with a very different number of points
changes how a morph looks; check the transition into and out of the cloud you changed.

After a change here there is no automatic test: scroll the whole home page on a desktop window and on a phone-sized one.
