import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ADMINISTRATIVE, DEVELOPER, expectNoAxeViolations, me, renderAdmin } from './helpers'

const AUDIT = '/api/admin/audit'
const SYSTEM = '/api/admin/system'

const developer = () => ({ 'GET /api/auth/me': { body: me({ name: 'Dev Eloper', grants: DEVELOPER }) } })

const entry = (over = {}) => ({
  id: 10,
  at: '2026-10-30T09:15:30Z',
  user_email: 'ada@example.org',
  action: 'person.update',
  entity_type: 'person',
  entity_key: 'grace-hopper',
  before: { title: 'PhD Student' },
  after: { title: 'Research Fellow' },
  ...over,
})
const logPage = (entries, next_before = null, actions = ['page.intro', 'person.update']) => ({ body: { entries, next_before, actions } })

const status = (over = {}) => ({
  server_time: '2026-10-31T10:00:00Z',
  database: { ok: true, migration: '3b7d5e90a1c8' },
  links: {
    last_check: '2026-10-30T19:25:00Z',
    stale: false,
    stale_after_days: 3,
    total: 120,
    ok: 100,
    broken: 6,
    blocked: 9,
    unchecked: 5,
    reported: 2,
    threshold: 3,
    by_keeper: [
      { area: 'people', total: 60, broken: 4, reported: 1, blocked: 5, keepers: ['Ada Demo', 'Bea Demo'] },
      { area: 'site', total: 20, broken: 2, reported: 1, blocked: 0, keepers: ['Ada Demo', 'Bea Demo'] },
      { area: 'projects', total: 30, broken: 0, reported: 0, blocked: 4, keepers: [] },
      { area: 'theme', total: 10, broken: 0, reported: 0, blocked: 0, keepers: ['Tom Demo'] },
    ],
  },
  media: { files: 42, bytes: 5 * 1024 * 1024 },
  accounts: { total: 5, active: 4, on_temporary_password: 1 },
  requests_open: 2,
  content: { people: 60, themes: 4, projects: 31, collaborators: 40, joint_projects: 8 },
  ...over,
})

describe('the activity log', () => {
  it('lists the entries with who, what and when, and has no accessibility violations', async () => {
    const { container } = renderAdmin('/audit', {
      ...developer(),
      [`GET ${AUDIT}?limit=50`]: logPage([entry(), entry({ id: 9, action: 'page.intro', entity_type: 'page', entity_key: 'people', before: null, after: null })]),
    })
    expect(await screen.findByRole('heading', { level: 1, name: 'Activity log' })).toBeInTheDocument()
    const table = await screen.findByRole('table', { name: /2 entries shown, the newest first/ })
    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(3)
    expect(rows[1]).toHaveTextContent('30 Oct 2026')
    expect(rows[1]).toHaveTextContent('ada@example.org')
    expect(rows[1]).toHaveTextContent('person.update')
    expect(rows[1]).toHaveTextContent('person grace-hopper')
    expect(rows[2]).toHaveTextContent('Nothing more')
    expect(screen.getByText('That is the whole log.')).toBeInTheDocument()
    await expectNoAxeViolations(container)
  })

  it('shows what changed, before and after, when asked', async () => {
    const user = userEvent.setup()
    renderAdmin('/audit', { ...developer(), [`GET ${AUDIT}?limit=50`]: logPage([entry()]) })
    await user.click(await screen.findByText('Show', { selector: 'summary' }))
    expect(screen.getByText('Before')).toBeInTheDocument()
    expect(screen.getByText('After')).toBeInTheDocument()
    expect(screen.getByText(/"title": "Research Fellow"/)).toBeInTheDocument()
    expect(screen.getByText(/"title": "PhD Student"/)).toBeInTheDocument()
  })

  it('says so when nothing matches', async () => {
    renderAdmin('/audit', { ...developer(), [`GET ${AUDIT}?limit=50`]: logPage([]) })
    expect(await screen.findByText('Nothing in the log matches.')).toBeInTheDocument()
  })

  it('asks for the older entries when the reader wants them, and adds them below', async () => {
    const user = userEvent.setup()
    const { calls } = renderAdmin('/audit', {
      ...developer(),
      [`GET ${AUDIT}?limit=50`]: logPage([entry({ id: 10 })], 10),
      [`GET ${AUDIT}?limit=50&before=10`]: logPage([entry({ id: 8, entity_key: 'old-one' })], null),
    })
    await user.click(await screen.findByRole('button', { name: 'Show older entries' }))
    expect(await screen.findByText('old-one')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /2 entries shown/ })).toBeInTheDocument()
    expect(screen.getByText('That is the whole log.')).toBeInTheDocument()
    expect(calls.filter((c) => c.method === 'GET' && c.url.startsWith(AUDIT))).toHaveLength(2)
  })

  it('narrows the log to one kind of action and one user', async () => {
    const user = userEvent.setup()
    const { calls } = renderAdmin('/audit', {
      ...developer(),
      [`GET ${AUDIT}?limit=50`]: logPage([entry(), entry({ id: 9, action: 'page.intro' })]),
      [`GET ${AUDIT}?limit=50&action=page.intro&user=bea`]: logPage([entry({ id: 9, action: 'page.intro', user_email: 'bea@example.org' })], null),
    })
    await screen.findByRole('table')
    await user.selectOptions(screen.getByLabelText('Kind of action'), 'page.intro')
    await user.type(screen.getByLabelText('Who (part of the email)'), ' bea ')
    await user.click(screen.getByRole('button', { name: 'Show these entries' }))
    expect(await screen.findByRole('table', { name: /1 entry shown/ })).toBeInTheDocument()
    expect(calls.at(-1).url).toBe(`${AUDIT}?limit=50&action=page.intro&user=bea`)
  })

  it('clears the filters', async () => {
    const user = userEvent.setup()
    renderAdmin('/audit', {
      ...developer(),
      [`GET ${AUDIT}?limit=50`]: logPage([entry(), entry({ id: 9 })]),
      [`GET ${AUDIT}?limit=50&user=bea`]: logPage([]),
    })
    await screen.findByRole('table')
    await user.type(screen.getByLabelText('Who (part of the email)'), 'bea')
    await user.click(screen.getByRole('button', { name: 'Show these entries' }))
    expect(await screen.findByText('Nothing in the log matches.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear the filters' }))
    expect(await screen.findByRole('table', { name: /2 entries shown/ })).toBeInTheDocument()
    expect(screen.getByLabelText('Who (part of the email)')).toHaveValue('')
  })

  it('shows why the log could not be loaded', async () => {
    renderAdmin('/audit', { ...developer(), [`GET ${AUDIT}?limit=50`]: { status: 500, body: { detail: 'broken' } } })
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('is closed to everyone but the developer', async () => {
    renderAdmin('/audit', { 'GET /api/auth/me': { body: me({ grants: ADMINISTRATIVE }) } })
    expect(await screen.findByRole('heading', { level: 1, name: 'You do not have access to this page' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Activity log' })).not.toBeInTheDocument()
  })
})

describe('the system status', () => {
  it('says how the system is doing, and has no accessibility violations', async () => {
    const { container } = renderAdmin('/system', { ...developer(), [`GET ${SYSTEM}`]: { body: status() } })
    expect(await screen.findByRole('heading', { level: 1, name: 'System status' })).toBeInTheDocument()
    const links = (await screen.findByRole('heading', { level: 2, name: 'Check of the links' })).closest('section')
    expect(links).toHaveTextContent('30 October 2026')
    expect(links).toHaveTextContent('Links in the content120')
    expect(links).toHaveTextContent('Working100')
    expect(links).toHaveTextContent('Failed the last check6')
    expect(links).toHaveTextContent('failed 3 checks in a row)2')
    expect(links).toHaveTextContent('Not checked, because the site refuses programs9')
    expect(screen.getByRole('heading', { level: 2, name: 'Database and files' }).closest('section')).toHaveTextContent('Version of the tables3b7d5e90a1c8')
    expect(screen.getByText(/42 files, 5.0 MB/)).toBeInTheDocument()
    const accounts = screen.getByRole('heading', { level: 2, name: 'Accounts' }).closest('section')
    expect(accounts).toHaveTextContent('Switched on4')
    expect(accounts).toHaveTextContent('Still on a temporary password1')
    expect(screen.getByRole('heading', { level: 2, name: 'Content' }).closest('section')).toHaveTextContent('Funded projects31')
    expect(screen.queryByRole('heading', { name: 'Requests' })).not.toBeInTheDocument() // the requests have their own page
    expect(screen.queryByText(/has not run for more than/)).not.toBeInTheDocument()
    await expectNoAxeViolations(container)
  })

  it('counts the failing links by who keeps them, with their names, and says when no account keeps a kind', async () => {
    renderAdmin('/system', { ...developer(), [`GET ${SYSTEM}`]: { body: status() } })
    const table = await screen.findByRole('table', { name: 'Who keeps the links' })
    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(5)
    const cells = (row) => within(row).getAllByRole('cell').map((c) => c.textContent)
    expect(within(rows[1]).getByRole('rowheader')).toHaveTextContent("People's links")
    expect(cells(rows[1])).toEqual(['Ada Demo, Bea Demo', '60', '4', '1'])
    expect(within(rows[2]).getByRole('rowheader')).toHaveTextContent('Collaborators and joint projects')
    expect(cells(rows[2])).toEqual(['Ada Demo, Bea Demo', '20', '2', '1'])
    expect(within(rows[3]).getByRole('rowheader')).toHaveTextContent('Funded projects')
    expect(cells(rows[3])).toEqual(['No active account', '30', '0', '0'])
    expect(cells(rows[4])).toEqual(['Tom Demo', '10', '0', '0'])
  })

  it('has no accessibility violations with the table', async () => {
    const { container } = renderAdmin('/system', { ...developer(), [`GET ${SYSTEM}`]: { body: status() } })
    await screen.findByRole('table', { name: 'Who keeps the links' })
    await expectNoAxeViolations(container)
  })

  it('warns when the check of the links has not run for days', async () => {
    renderAdmin('/system', { ...developer(), [`GET ${SYSTEM}`]: { body: status({ links: { ...status().links, stale: true } }) } })
    expect(await screen.findByText(/has not run for more than 3 days/)).toBeInTheDocument()
    expect(screen.getByText('python -m app.manage check-links')).toBeInTheDocument()
  })

  it('warns when the check of the links has never run', async () => {
    renderAdmin('/system', { ...developer(), [`GET ${SYSTEM}`]: { body: status({ links: { ...status().links, last_check: null, stale: true, total: 0, ok: 0, broken: 0, blocked: 0, unchecked: 0, reported: 0 } }) } })
    expect(await screen.findByText(/has never run/)).toBeInTheDocument()
    expect(screen.getByText('Never')).toBeInTheDocument()
  })

  it('says when the database does not answer', async () => {
    renderAdmin('/system', { ...developer(), [`GET ${SYSTEM}`]: { body: status({ database: { ok: false, migration: null } }) } })
    expect(await screen.findByRole('alert')).toHaveTextContent('The database does not answer.')
    expect(screen.getByText('Not answering')).toBeInTheDocument()
  })

  it('looks again when asked', async () => {
    const user = userEvent.setup()
    let asked = 0
    renderAdmin('/system', { ...developer(), [`GET ${SYSTEM}`]: () => ({ body: status({ media: { files: asked++ === 0 ? 42 : 43, bytes: 5 * 1024 * 1024 } }) }) })
    await screen.findByText(/42 files/)
    await user.click(screen.getByRole('button', { name: 'Look again' }))
    expect(await screen.findByText(/43 files/)).toBeInTheDocument()
  })

  it('is closed to everyone but the developer', async () => {
    renderAdmin('/system', { 'GET /api/auth/me': { body: me() } })
    expect(await screen.findByRole('heading', { level: 1, name: 'You do not have access to this page' })).toBeInTheDocument()
  })
})

describe('the developer’s navigation and home page', () => {
  it('has the requests, the activity log and the system in the navigation, and nothing of the others’ work', async () => {
    renderAdmin('/', { ...developer(), [`GET ${SYSTEM}`]: { body: status({ requests_open: 0 }) } })
    await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })
    const navigation = screen.getByRole('navigation', { name: 'Main' })
    expect(within(navigation).getByRole('link', { name: 'Requests' })).toHaveAttribute('href', '/requests')
    expect(within(navigation).getByRole('link', { name: 'Activity log' })).toHaveAttribute('href', '/audit')
    expect(within(navigation).getByRole('link', { name: 'System' })).toHaveAttribute('href', '/system')
    expect(navigation).not.toHaveTextContent('People')
    expect(navigation).not.toHaveTextContent('Accounts')
  })

  it('offers the developer three tasks', async () => {
    renderAdmin('/', { ...developer(), [`GET ${SYSTEM}`]: { body: status({ requests_open: 0 }) } })
    await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })
    const tasks = screen.getByRole('list', { name: 'Things you can do' })
    expect(within(tasks).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByRole('link', { name: /Read the activity log/ })).toHaveAttribute('href', '/audit')
    expect(screen.getByRole('link', { name: /See how the system is doing/ })).toHaveAttribute('href', '/system')
    expect(screen.getByRole('link', { name: /Answer the requests/ })).toHaveAttribute('href', '/requests')
    expect(screen.queryByText(/not allowed to do anything/)).not.toBeInTheDocument()
  })

  it('says on the home page when requests wait, and when the check of the links has stopped', async () => {
    renderAdmin('/', { ...developer(), [`GET ${SYSTEM}`]: { body: status({ links: { ...status().links, stale: true } }) } })
    expect(await screen.findByText(/2 requests are waiting for an answer/)).toBeInTheDocument()
    expect(screen.getByText(/The check of the links has stopped running/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See the system status' })).toHaveAttribute('href', '/system')
  })

  it('says nothing when all is well', async () => {
    renderAdmin('/', { ...developer(), [`GET ${SYSTEM}`]: { body: status({ requests_open: 0 }) } })
    await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })
    expect(screen.queryByText(/waiting for an answer/)).not.toBeInTheDocument()
    expect(screen.queryByText(/stopped running/)).not.toBeInTheDocument()
  })

  it('has no "I can\'t find what I need" link, since the developer is the one who answers', async () => {
    renderAdmin('/', { ...developer(), [`GET ${SYSTEM}`]: { body: status({ requests_open: 0 }) } })
    await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: "I can't find what I need" })).not.toBeInTheDocument()
  })

  it('does not show the home notices to the administrative staff', async () => {
    renderAdmin('/', { 'GET /api/auth/me': { body: me() } })
    await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })
    expect(screen.queryByRole('link', { name: 'Activity log' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'System' })).not.toBeInTheDocument()
  })
})
