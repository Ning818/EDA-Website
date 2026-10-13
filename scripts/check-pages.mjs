// A render smoke test of the inner pages: every route of the router that is not the Home page is rendered on the server with the
// real <App /> (header, page, footer), and the output must carry the page's title, an artwork where the page has one, and no
// leaked "undefined" / "[object Object]". Home is not covered - it is one WebGL canvas, which needs a browser.
// Run it with:  node scripts/check-pages.mjs
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createReport } from './lib/report.mjs'
import { startLoader } from './lib/vite-load.mjs'

const r = createReport('pages')
const loader = await startLoader()

try {
  const { THEMES } = await loader.load('/src/themes.js')
  const { default: App } = await loader.load('/src/App.jsx')
  const { StaticRouter } = await import('react-router-dom')

  const routes = [
    ...THEMES.flatMap((t) => [
      { path: t.research, title: t.name, art: Boolean(t.header) },
      { path: t.projects, title: t.name, art: Boolean(t.header) },
    ]),
    { path: '/collaborations', title: 'Collaborations', art: true },
    { path: '/teaching', title: 'Teaching', art: false },
  ]

  for (const route of routes) {
    const w = `route ${route.path}`
    try {
      const html = renderToString(createElement(StaticRouter, { location: route.path }, createElement(App)))
      r.check(html.includes(route.title), `${w}: the title "${route.title}" is not in the page`)
      if (route.art) r.check(/<canvas\b/.test(html), `${w}: no artwork (<canvas>) in the page`)
      r.check(!/>undefined<|\[object Object\]/.test(html), `${w}: leaked "undefined" or "[object Object]" into the page`)
    } catch (err) {
      r.check(false, `${w}: rendering threw - ${err.message}`)
    }
  }
} finally {
  await loader.close()
}

process.exit(r.finish())
