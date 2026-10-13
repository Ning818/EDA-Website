// The registry of the page-header artworks: the picture on the right of the title band of every Research / Funded Projects
// page. `themes.js` names one of the keys below per theme (its `header`), PageIntroBand looks it up here and draws it - so a
// new artwork is "write the component, add one entry here, point a theme at its key" and nothing else needs to change. See
// docs/HOW-TO-ADD-AN-EFFECT.md for the whole recipe and docs/HOW-TO-MODIFY-AN-EFFECT.md for tuning an existing one.
//
// An entry:
//   label      what the effect is called in the preview page (/dev/effects) and the docs
//   engine     'flat-particles' (a Canvas 2D drawing built on flatParticles.js, the 2D particle engine) | 'canvas' (a hand-written
//              Canvas 2D drawing, the circuit) | 'svg' (the thin-line pictures the particle versions were made from)
//   component  the React component that draws it; it fills its parent (an absolutely positioned canvas / svg)
//   pages      the looks it has: the page it is shown on ('research' | 'projects') is passed down as the `page` of `props`
//   props      (ctx) => the component's props; ctx = { color, page, light } - the theme's colour, which page it is on, and
//              whether the page's background is light (only the line-art svgs care)
//   source     the file to open to change the artwork; geometry: the file that holds its drawing data (if separate)
//   legacy     true for the older line-art versions that no theme uses any more, kept as the particle versions' reference
import HeaderDecor from '../components/sections/HeaderDecor'
import FactoryDecor from '../components/sections/FactoryDecor'
import FactoryParticles from '../components/sections/FactoryParticles'
import HelixDecor from '../components/sections/HelixDecor'
import HelixParticles from '../components/sections/HelixParticles'
import SkylineDecor from '../components/sections/SkylineDecor'
import SkylineParticles from '../components/sections/SkylineParticles'

const PAGES = ['research', 'projects']

export const HEADER_EFFECTS = {
  circuit: {
    label: 'Particle circuit (VLSI-CAD)',
    engine: 'canvas',
    component: HeaderDecor,
    pages: PAGES,
    props: ({ page }) => ({ variant: page }),
    source: 'src/components/sections/HeaderDecor.jsx',
  },
  'helix-particles': {
    label: 'DNA of flat particles (Bioinformatics)',
    engine: 'flat-particles',
    component: HelixParticles,
    pages: PAGES,
    props: ({ color, page }) => ({ color, variant: page }),
    source: 'src/components/sections/HelixParticles.jsx',
    geometry: 'src/components/sections/helixGeometry.js',
  },
  'skyline-particles': {
    label: 'City of flat particles (Smart City)',
    engine: 'flat-particles',
    component: SkylineParticles,
    pages: PAGES,
    props: ({ color, page }) => ({ color, variant: page }),
    source: 'src/components/sections/SkylineParticles.jsx',
    geometry: 'src/components/sections/skylineGeometry.js',
  },
  'factory-particles': {
    label: 'Smart factory of flat particles (Industry 4.0)',
    engine: 'flat-particles',
    component: FactoryParticles,
    pages: PAGES,
    props: ({ color, page }) => ({ color, variant: page }),
    source: 'src/components/sections/FactoryParticles.jsx',
    geometry: 'src/components/sections/factoryGeometry.js',
  },
  helix: {
    label: 'DNA, thin lines',
    engine: 'svg',
    legacy: true,
    component: HelixDecor,
    pages: PAGES,
    props: ({ color }) => ({ color }),
    source: 'src/components/sections/HelixDecor.jsx',
    geometry: 'src/components/sections/helixGeometry.js',
  },
  skyline: {
    label: 'City, thin lines',
    engine: 'svg',
    legacy: true,
    component: SkylineDecor,
    pages: PAGES,
    props: ({ color, light }) => ({ color, light }),
    source: 'src/components/sections/SkylineDecor.jsx',
    geometry: 'src/components/sections/skylineGeometry.js',
  },
  factory: {
    label: 'Smart factory, thin lines',
    engine: 'svg',
    legacy: true,
    component: FactoryDecor,
    pages: PAGES,
    props: ({ color, light }) => ({ color, light }),
    source: 'src/components/sections/FactoryDecor.jsx',
    geometry: 'src/components/sections/factoryGeometry.js',
  },
}

/** The entry for a theme's `header` key, or null for none (`null`, 'none' or an unknown key - which also warns in development). */
export function headerEffectFor(key) {
  if (!key || key === 'none') return null
  const effect = HEADER_EFFECTS[key]
  if (!effect && import.meta.env?.DEV) console.warn(`[effects] no header effect registered as "${key}" - add it to src/effects/headerEffects.js`)
  return effect ?? null
}
