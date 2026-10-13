# How to add a new effect

Two cases, with very different effort.

| Case                                                       | Effort            | Section |
| ---------------------------------------------------------- | ----------------- | ------- |
| a new **header artwork** (the picture in a page's title band) | an afternoon; registry-based | 1 |
| a new **home cloud** (another stage of the scrolling story)   | days; hand-wired in a large file | 2 |

---

## 1. A new header artwork

Example: a "Quantum" artwork for a new theme or to replace one.

### Step 1 - the picture's geometry

Create `src/components/sections/quantumGeometry.js` (any name; follow `skylineGeometry.js`). It exports the picture's size and the
shapes as SVG path strings:

```js
export const W = 660 // the picture's own units; the layout fits them to the canvas
export const H = 360
export const WIRES = ['M10 300 H650', 'M10 260 C200 260 200 100 330 100' /* ... */]
```

Draw the shapes in any vector editor and take the path `d` strings, or write them by hand. Keep the picture inside `W x H`.

### Step 2 - the component

Create `src/components/sections/QuantumParticles.jsx`, modelled on `SkylineParticles.jsx` (the shortest of the three):

```jsx
import { useEffect, useRef } from 'react'
import { DENSE, densePath, rng, startFlatParticles } from './flatParticles'
import { W, H, WIRES } from './quantumGeometry'

const AMBER = '#e0a94a' // the second colour, shared by all themes' artworks
const SPACING = 6 // between the particles of a line

function build(variant) {
  const rand = rng(7)
  const particles = []
  const traces = []
  WIRES.forEach((d, i) => {
    const tr = densePath(d)
    const idx = traces.push(tr) - 1
    for (let s = 0; s <= tr.length; s += SPACING) {
      const k = Math.min(tr.n, Math.round(s / DENSE))
      particles.push({
        mode: 0, trace: idx, s, rx: tr.pts[2 * k], ry: tr.pts[2 * k + 1],
        c: variant === 'research' && i % 3 === 0 ? 1 : 0, // colour 0 = theme colour, 1 = amber
        r: 2 + rand() * 0.6, a: 0.9,
        T: 0.2 + i * 0.12 + s / tr.length, D: 0.3 + s / 900, ph: rand() * 6.28,
      })
    }
  })
  return { particles, traces }
}

export default function QuantumParticles({ color = '#7a5cc4', variant = 'projects' }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const { particles, traces } = build(variant)
    return startFlatParticles(canvasRef.current, {
      particles,
      traces,
      colors: [color, AMBER],
      layout: (w, h) => {
        const sc = Math.min(w / W, h / H)
        return { sc, tx: w - W * sc, ty: h - H * sc } // stands on the bottom edge, at the right
      },
    })
  }, [color, variant])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <canvas
        ref={canvasRef}
        style={{ aspectRatio: `${W} / ${H}` }}
        className="absolute bottom-0 right-0 w-[min(660px,calc(100vw_-_560px))] max-md:bottom-auto max-md:w-full max-md:opacity-40 [mask-image:linear-gradient(to_left,black_92%,transparent_100%)]"
      />
    </div>
  )
}
```

What `variant` is for: the theme has two pages (`research`, `projects`) and the artwork has two looks, told apart by where the
second colour goes. If you want one look only, ignore it and list one page in the registry.

### Step 3 - register it

In `src/effects/headerEffects.js` add the import and one entry:

```js
import QuantumParticles from '../components/sections/QuantumParticles'
// ...
  'quantum-particles': {
    label: 'Quantum circuit of flat particles',
    engine: 'flat-particles',
    component: QuantumParticles,
    pages: PAGES,
    props: ({ color, page }) => ({ color, variant: page }),
    source: 'src/components/sections/QuantumParticles.jsx',
    geometry: 'src/components/sections/quantumGeometry.js',
  },
```

### Step 4 - look at it

Open <http://localhost:5173/dev/effects>. The new artwork is listed, in both looks, in any colour; press Replay to see the
intro. Adjust `SPACING`, the delays and the canvas `className` until it looks right. Then check phone width.

### Step 5 - give a theme the artwork

In `src/themes.js` set the theme's `header: 'quantum-particles'` (and its `color`). If it is a **new theme**, also:

* add its entries to `RESEARCH_BY_THEME` and `PROJECTS_BY_THEME` (`src/content/`) and `HOME_THEME_COPY` (`src/content/home.js`);
* the navigation menus are built from `THEMES`, so they follow by themselves;
* a new theme also needs a home cloud (section 2) and an entry in the list in `src/pages/Home.jsx`; until then it exists as
  pages only.

### Step 6 - check

```bash
npm run check
```

The checks fail with a clear message if the theme names an unregistered key, the entry is incomplete, the source file does not
exist, or the artwork throws when rendered.

---

## 2. A new home cloud

The home canvas is one file (`src/three/ParticleCanvas.jsx`) in which every cloud and every transition between two clouds is
wired by hand. There is no registry for it. Adding a cloud is a known list of edits; search the file for how `dna` (or `city`)
appears and repeat each occurrence for the new name. Plan for it to be careful, not quick, and to need a few rounds of tuning in
the browser.

### The edits

1. **Model.** Put the GLB or DXF in `public/models/`. For DXF the layers/entities the builder reads must be named as the existing
   builders expect (see `DNAParticles.jsx`'s top comment); for GLB see `IndustryArmParticles.jsx`.
2. **Builder.** `src/three/<Name>Particles.jsx`, modelled on the nearest existing one (`DNAParticles.jsx` for line drawings,
   `IndustryArmParticles.jsx` for line meshes, `VLSICADParticles.jsx` for meshes). Export `build<Name>Cloud`,
   `<NAME>_PARTICLE_SIZE`, the resting orientation, and keep `TARGET_EXTENT`, spacing and colours as constants at the top.
3. **Anchor.** `src/three/<Name>Scene.jsx`, copied from `DNAScene.jsx`, with its own `data-cloud="<key>"`.
4. **The canvas, in `ParticleCanvas.jsx`.** In this order, for each place `dna` / `city` appears:
   * import the builder and its constants;
   * load the model with `useLoader` and add it to the effect's dependency list;
   * add an `anim<N>` ref for the transition into it and for the one out of it;
   * build the cloud, then the matched pair targets with `matchedTarget(...)` and the points objects with `makePoints(...)` for
     "previous to new" and "new, settled";
   * register the timeline with `scatteredTimeline(anim, pinEnd('<prev>'), pinStart('<new>'))`;
   * add the anchor lookup (`anchorEl('<key>')`) and add the objects to the `all` list;
   * add its transition and settled-state blocks in the per-frame update (copy the block of the cloud before it);
   * add the two `<primitive object=... />` lines at the bottom.
5. **The section.** An entry in the `THEMES` list of `src/pages/Home.jsx` (`theme`, `copy`, `imageSide`, `dwell`, `gap`,
   `visual`), and the text in `HOME_THEME_COPY`.
6. **Scroll lengths.** `dwell` and `gap` must agree with the timeline constants in `ParticleCanvas.jsx`; follow the comments at
   the other themes.

### Test it

There is no automatic test for the home canvas. Scroll the page slowly in both directions on a desktop window and on a
phone-sized window, and watch: the cloud before it (does it still leave cleanly), the new cloud (does it form), the one after
(does it still arrive), and the frame rate.

### A known limit

Because every transition is a pair, inserting a cloud in the middle of the story means re-wiring two transitions, not one.
Adding at the end is the easy case. Turning this file into a list-driven one (clouds declared as data, transitions generated)
is possible, but should be done with screenshot-based regression tests first, because the timing has been tuned by eye.
