import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { axe } from 'vitest-axe'
import App from '../src/App'

export const ADMINISTRATIVE = [
  { area: 'people_add', theme: null },
  { area: 'people_edit', theme: null },
  { area: 'people_delete', theme: null },
  { area: 'site', theme: null },
  { area: 'accounts', theme: null },
]
export const THEME_OWNER = [
  { area: 'people_add', theme: null },
  { area: 'theme', theme: null },
]
export const PROJECTS_OWNER = [{ area: 'projects', theme: null }]
export const DEVELOPER = [{ area: 'system', theme: null }]

export const me = (over = {}) => ({ id: 1, email: 'ada@example.org', name: 'Ada Lovelace', grants: ADMINISTRATIVE, must_change_password: false, ...over })

export const person = (over = {}) => ({
  slug: 'enrico-macii',
  name: 'Enrico Macii',
  card_name: 'Enrico Macii',
  title: 'Full Professor',
  title_short: 'Full Prof.',
  group: 'professors',
  photo_url: null,
  links: { polito: 'https://www.polito.it/enrico' },
  page_url: 'https://www.polito.it/enrico',
  page_kind: 'staff',
  can_edit: true,
  can_delete: false,
  editable_until: null,
  ...over,
})

export const THEMES = [
  { slug: 'bioinformatics', name: 'Bioinformatics', short_name: null, home_summary: null },
  { slug: 'smart-city', name: 'Smart City', short_name: null, home_summary: null },
]

export const project = (over = {}) => ({
  id: 1,
  theme_slug: 'bioinformatics',
  theme_name: 'Bioinformatics',
  status: 'ongoing',
  code: 'GENEX',
  description: 'GENE EXPRESSION AND MODELING',
  url: 'https://genex.example.eu/',
  ...over,
})

export const collaborator = (over = {}) => ({
  id: 5,
  kind: 'university',
  name: 'Brown University',
  url: 'https://www.brown.edu/',
  logo_url: '/media/collaborators/universities/brown.png',
  position: 0,
  ...over,
})

export const jointProject = (over = {}) => ({
  id: 3,
  code: 'DIMMER',
  name: 'District Information Modeling and Management for Energy Reduction',
  funding: 'EU FP7',
  years: '2013-2016',
  coordinator: 'Politecnico di Torino',
  partners: ['Arup', 'IREN'],
  url: 'https://cordis.europa.eu/project/id/609084',
  position: 0,
  ...over,
})

export const personRef = (over = {}) => ({ slug: 'enrico-macii', name: 'Enrico Macii', title: 'Full Professor', title_short: 'Full Prof.', ...over })

export const theme = (over = {}) => ({
  slug: 'bioinformatics',
  name: 'Bioinformatics',
  short_name: null,
  home_summary: 'The home paragraph.',
  intro: 'The introduction of the Research page.',
  areas: [
    { id: 11, title: 'Gene expression and modeling', topics: [{ id: 101, text: 'Regulatory networks' }, { id: 102, text: 'Modeling of expression' }], people: [personRef(), personRef({ slug: 'sara-vinco', name: 'Sara Vinco', title: 'Associate Professor', title_short: 'Assoc. Prof.' })] },
    { id: 12, title: 'Sequencing data analysis', topics: [], people: [] },
  ],
  contacts: [personRef()],
  highlight_paper: {
    kind: 'paper',
    title: 'A paper on genes',
    subtitle: null,
    authors_full: 'Ada Lovelace, Grace Hopper',
    authors_short: 'A. Lovelace, G. Hopper',
    venue: 'Journal of Genes',
    tags: ['Genes', 'Models'],
    text: 'What the paper shows.',
    url: 'https://iris.polito.it/handle/11583/1',
    image_url: '/media/highlights/paper-bioinformatics.jpg',
    image_alt: 'A plot of gene expression',
  },
  highlight_project: null,
  ...over,
})

export const everyone = [
  person({ slug: 'enrico-macii', name: 'Enrico Macii', card_name: 'Enrico Macii' }),
  person({ slug: 'sara-vinco', name: 'Sara Vinco', card_name: 'Sara Vinco', title: 'Associate Professor' }),
  person({ slug: 'jose-garcia', name: 'José García', card_name: 'José García', title: 'PhD Student', group: 'phd-students' }),
  person({ slug: 'old-friend', name: 'Old Friend', card_name: 'Old Friend', title: 'Former member', group: 'alumni' }),
]

export const account = (over = {}) => ({
  id: 2,
  email: 'tom@example.org',
  name: 'Tom Rossi',
  is_active: true,
  must_change_password: false,
  created_at: '2026-10-27T10:00:00Z',
  last_login_at: null,
  preset: 'theme-owner',
  grants: THEME_OWNER,
  ...over,
})

/**
 * Stands in for the API. `routes` maps "METHOD /path" to an answer ({ status, body }) or a function of the request that gives one; a request nobody planned for fails the test.
 * Returns what was asked, so a test can look at it.
 */
export function mockApi(routes) {
  const calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, init = {}) => {
      const method = (init.method ?? 'GET').toUpperCase()
      calls.push({ method, url, body: init.body })
      const handler = routes[`${method} ${url}`]
      if (!handler) throw new Error(`Unexpected request: ${method} ${url}`)
      const { status = 200, body = null } = typeof handler === 'function' ? await handler(init) : handler
      return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
    }),
  )
  return calls
}

export const unauthorized = { status: 401, body: { detail: 'Log in first' } }

export function renderAdmin(path, routes) {
  const calls = mockApi(routes)
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
  return { ...view, calls }
}

/** What a FormData holds, as a plain object (a field sent twice, such as `clear`, becomes a list). */
export function formOf(call) {
  const out = {}
  for (const [key, value] of call.body.entries()) out[key] = key in out ? [].concat(out[key], value) : value
  return out
}

export async function expectNoAxeViolations(container) {
  expect(await axe(container)).toHaveNoViolations()
}
