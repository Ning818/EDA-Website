import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PROJECTS_OWNER, expectNoAxeViolations, me, renderAdmin } from './helpers'

const PROBLEMS = '/api/admin/links/problems'

const problem = (over = {}) => ({
  id: 7,
  source_type: 'collaborator',
  source_key: '5',
  field: 'url',
  label: 'Brown University: website',
  url: 'https://www.brown.edu/gone',
  detail: '404 Not Found',
  failures: 4,
  first_failed_at: '2026-10-27T04:00:00Z',
  last_checked_at: '2026-10-30T04:00:00Z',
  ...over,
})

const answer = (problems, last_check = '2026-10-30T04:00:00Z') => ({ body: { problems, last_check, threshold: 3 } })
const staff = (problems, extra = {}) => ({ 'GET /api/auth/me': { body: me() }, [`GET ${PROBLEMS}`]: answer(problems), ...extra })

describe('the broken links page', () => {
  it('lists each broken link with what is wrong, since when, and has no accessibility violations', async () => {
    const { container } = renderAdmin(
      '/links',
      staff([problem(), problem({ id: 8, source_type: 'person', source_key: 'enrico-macii', label: 'Enrico Macii: Google Scholar', url: 'https://scholar.example/x', detail: 'Could not connect', failures: 3 })]),
    )
    expect(await screen.findByRole('heading', { level: 1, name: 'Broken links' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 2, name: '2 links to look at' })).toBeInTheDocument()
    const first = screen.getByRole('heading', { level: 3, name: 'Brown University: website' }).closest('li')
    expect(first).toHaveTextContent('https://www.brown.edu/gone')
    expect(first).toHaveTextContent('404 Not Found.')
    expect(first).toHaveTextContent('It failed 4 checks in a row, since 27 October 2026')
    expect(screen.getByText(/A link is reported here only after it has failed 3 checks in a row/)).toBeInTheDocument()
    await expectNoAxeViolations(container)
  })

  it('leads each link to the page where its content is changed', async () => {
    renderAdmin(
      '/links',
      staff([
        problem(),
        problem({ id: 8, source_type: 'person', source_key: 'enrico-macii', label: 'Enrico Macii: Scholar' }),
        problem({ id: 9, source_type: 'joint_project', source_key: '3', label: 'DIMMER: record' }),
        problem({ id: 10, source_type: 'project', source_key: '1', label: 'GENEX: site' }),
        problem({ id: 11, source_type: 'highlight', source_key: 'smart-city:paper', label: 'Smart City: highlight paper' }),
      ]),
    )
    await screen.findByRole('heading', { level: 2, name: '5 links to look at' })
    const href = (label) => screen.getByRole('link', { name: `Change it: ${label}` }).getAttribute('href')
    expect(href('Brown University: website')).toBe('/collaborators/5')
    expect(href('Enrico Macii: Scholar')).toBe('/people/enrico-macii')
    expect(href('DIMMER: record')).toBe('/joint-projects/3')
    expect(href('GENEX: site')).toBe('/projects/1')
    expect(href('Smart City: highlight paper')).toBe('/themes/smart-city/highlights/paper')
  })

  it('says so when no link is broken', async () => {
    renderAdmin('/links', staff([]))
    expect(await screen.findByText('No link that you keep is broken.')).toBeInTheDocument()
  })

  it('says so when no check has been run yet', async () => {
    renderAdmin('/links', staff([], { [`GET ${PROBLEMS}`]: answer([], null) }))
    expect(await screen.findByText('Nothing to show yet.')).toBeInTheDocument()
    expect(screen.getByText(/No check has been run yet/)).toBeInTheDocument()
  })

  it('takes a link off the list when checking it again finds it working, and says so', async () => {
    const user = userEvent.setup()
    const { calls } = renderAdmin('/links', staff([problem()], { 'POST /api/admin/links/problems/7/check': { body: { state: 'ok', detail: null, reported: false } } }))
    await user.click(await screen.findByRole('button', { name: 'Check again: Brown University: website' }))
    expect(await screen.findByText('No link that you keep is broken.')).toBeInTheDocument()
    expect(screen.getAllByText('Brown University: website: the link works now.').length).toBeGreaterThan(0)
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(1)
  })

  it('keeps a link on the list when it still fails, with the answer it gets now', async () => {
    const user = userEvent.setup()
    let asked = 0
    renderAdmin('/links', {
      'GET /api/auth/me': { body: me() },
      [`GET ${PROBLEMS}`]: () => answer(asked++ === 0 ? [problem()] : [problem({ detail: '500 Internal Server Error', failures: 5 })]),
      'POST /api/admin/links/problems/7/check': { body: { state: 'broken', detail: '500 Internal Server Error', reported: true } },
    })
    await user.click(await screen.findByRole('button', { name: 'Check again: Brown University: website' }))
    expect(await screen.findByText('500 Internal Server Error.')).toBeInTheDocument()
    expect(screen.getAllByText('Brown University: website: still not working (500 Internal Server Error).').length).toBeGreaterThan(0)
    expect(screen.getByText(/It failed 5 checks in a row/)).toBeInTheDocument()
  })

  it('says when the link is no longer in the content', async () => {
    const user = userEvent.setup()
    renderAdmin('/links', staff([problem()], { 'POST /api/admin/links/problems/7/check': { status: 404, body: { detail: { code: 'link_not_found', message: 'That link is not in the content any more.' } } } }))
    await user.click(await screen.findByRole('button', { name: 'Check again: Brown University: website' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('That link is not in the content any more.')
  })

  it('is closed to those who keep no content with links', async () => {
    renderAdmin('/links', { 'GET /api/auth/me': { body: me({ grants: [{ area: 'accounts', theme: null }] }) } })
    expect(await screen.findByRole('heading', { level: 1, name: 'You do not have access to this page' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Broken links' })).not.toBeInTheDocument()
  })

  it('is open to the owner of the funded projects, who has it in the navigation', async () => {
    renderAdmin('/links', { 'GET /api/auth/me': { body: me({ grants: PROJECTS_OWNER }) }, [`GET ${PROBLEMS}`]: answer([]) })
    expect(await screen.findByRole('heading', { level: 1, name: 'Broken links' })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Broken links' })).toHaveAttribute('href', '/links')
  })
})

describe('the broken links on the home page', () => {
  it('counts the links to look at, with a way to the page', async () => {
    renderAdmin('/', staff([problem(), problem({ id: 8 })]))
    expect(await screen.findByText(/2 links in the content you keep have stopped working/)).toBeInTheDocument()
    const notice = screen.getByText(/stopped working/).closest('[role="status"]')
    expect(within(notice).getByRole('link', { name: 'Check the broken links' })).toHaveAttribute('href', '/links')
  })

  it('says nothing when no link is broken', async () => {
    renderAdmin('/', staff([]))
    await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })
    expect(screen.queryByText(/stopped working/)).not.toBeInTheDocument()
  })
})
