// Checks the header-effects registry (src/effects/headerEffects.js) against the themes (src/themes.js):
//   - every theme's `header` is a registered effect (or null), and every theme has a valid colour and paths;
//   - every registered effect is complete (label, engine, component, pages, props, an existing source file);
//   - every effect, in each of its pages, actually renders (server-side render of the component, which is how the thin-line
//     FactoryDecor, unused and unnoticed, had come to crash on a renamed geometry field).
// Run it with:  node scripts/check-effects.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createReport } from './lib/report.mjs'
import { ROOT, startLoader } from './lib/vite-load.mjs'

const ENGINES = ['flat-particles', 'canvas', 'svg']
const PAGES = ['research', 'projects']
const r = createReport('effects')
const loader = await startLoader()

try {
  const { THEMES } = await loader.load('/src/themes.js')
  const { HEADER_EFFECTS } = await loader.load('/src/effects/headerEffects.js')

  // ---- themes ----
  const slugs = THEMES.map((t) => t.slug)
  r.check(new Set(slugs).size === slugs.length, `themes: slugs must be unique (${slugs.join(', ')})`)
  for (const t of THEMES) {
    r.check(/^#[0-9a-f]{6}$/i.test(t.color), `themes[${t.slug}]: colour must be a #rrggbb value (${t.color})`)
    r.check(t.research?.startsWith('/') && t.projects?.startsWith('/'), `themes[${t.slug}]: research and projects must be paths starting with "/"`)
    r.check(t.header === null || t.header in HEADER_EFFECTS, `themes[${t.slug}]: header "${t.header}" is not registered in src/effects/headerEffects.js`)
    if (t.header && HEADER_EFFECTS[t.header]?.legacy) r.warn(`themes[${t.slug}]: header "${t.header}" is a legacy (thin-line) effect`)
  }

  // ---- registry ----
  for (const [key, e] of Object.entries(HEADER_EFFECTS)) {
    const w = `effects[${key}]`
    r.check(typeof e.label === 'string' && e.label.length > 0, `${w}: label is required`)
    r.check(ENGINES.includes(e.engine), `${w}: engine must be one of ${ENGINES.join(', ')} (is "${e.engine}")`)
    r.check(typeof e.props === 'function', `${w}: props must be a function ({ color, page, light }) => props`)
    r.check(Array.isArray(e.pages) && e.pages.length > 0 && e.pages.every((p) => PAGES.includes(p)), `${w}: pages must be a non-empty subset of ${PAGES.join(', ')}`)
    for (const k of ['source', 'geometry']) {
      if (e[k] === undefined && k === 'geometry') continue
      r.check(typeof e[k] === 'string' && fs.existsSync(path.join(ROOT, e[k])), `${w}.${k}: file not found (${e[k]})`)
    }
    if (!e.legacy && !THEMES.some((t) => t.header === key)) r.warn(`${w}: no theme uses this effect`)

    // render every look once; a component that throws here would blank the page it is on
    for (const page of e.pages ?? []) {
      if (!r.check(typeof e.component === 'function' || typeof e.component === 'object', `${w}: component is not a React component`)) break
      try {
        const props = e.props({ color: '#336699', page, light: true })
        const html = renderToString(createElement(e.component, props))
        r.check(/<(canvas|svg)\b/.test(html), `${w} (${page}): rendered no <canvas> or <svg>`)
      } catch (err) {
        r.check(false, `${w} (${page}): rendering threw - ${err.message}`)
      }
    }
  }
} finally {
  await loader.close()
}

process.exit(r.finish())
