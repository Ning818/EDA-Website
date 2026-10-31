import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ADMINISTRATIVE, DEVELOPER, PROJECTS_OWNER, THEMES, currentUrl, everyone, me, project, renderAdmin } from './helpers'

// What a page is searching or filtering for is in its address, so that a reload, the back button and a link bring it back.

describe('the search of the people', () => {
  const routes = () => ({ 'GET /api/auth/me': { body: me({ grants: ADMINISTRATIVE }) }, 'GET /api/people': { body: everyone } })

  it('is in the address as it is typed, and leaves it when it is emptied', async () => {
    const user = userEvent.setup()
    renderAdmin('/people', routes())
    const search = await screen.findByLabelText('Search by name')
    await user.type(search, 'sara')
    expect(currentUrl()).toBe('/people?q=sara')
    await user.clear(search)
    expect(currentUrl()).toBe('/people')
  })

  it('is brought back by an address that has it', async () => {
    renderAdmin('/people?q=sara', routes())
    expect(await screen.findByLabelText('Search by name')).toHaveValue('sara')
    expect(await screen.findByText('1 of 4 people match.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Sara Vinco/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Enrico Macii/ })).not.toBeInTheDocument()
  })

  it('does not fill the history with a new entry for every key', async () => {
    const user = userEvent.setup()
    renderAdmin('/people', routes())
    await user.type(await screen.findByLabelText('Search by name'), 'sara')
    expect(window.history.length).toBeLessThan(5)
  })
})

describe('the search of the funded projects', () => {
  const routes = () => ({
    'GET /api/auth/me': { body: me({ grants: PROJECTS_OWNER }) },
    'GET /api/themes': { body: THEMES },
    'GET /api/admin/projects': { body: [project({ id: 1, code: 'GENEX', description: 'GENE EXPRESSION' }), project({ id: 2, code: 'OTHER', description: 'SOMETHING ELSE' })] },
  })

  it('is in the address as it is typed, and leaves it when it is emptied', async () => {
    const user = userEvent.setup()
    renderAdmin('/projects', routes())
    const search = await screen.findByLabelText('Search by code or description')
    await user.type(search, 'genex')
    expect(currentUrl()).toBe('/projects?q=genex')
    await user.clear(search)
    expect(currentUrl()).toBe('/projects')
  })

  it('is brought back by an address that has it', async () => {
    renderAdmin('/projects?q=genex', routes())
    expect(await screen.findByLabelText('Search by code or description')).toHaveValue('genex')
    expect(await screen.findByText('1 of 2 projects match.')).toBeInTheDocument()
  })
})

describe('the filters of the activity log', () => {
  const AUDIT = '/api/admin/audit'
  const entry = { id: 10, at: '2026-10-30T09:15:30Z', user_email: 'bea@example.org', action: 'page.intro', entity_type: 'page', entity_key: 'people', before: null, after: null }
  const page = (entries) => ({ body: { entries, next_before: null, actions: ['page.intro', 'person.update'] } })
  const base = () => ({ 'GET /api/auth/me': { body: me({ grants: DEVELOPER }) } })

  it('go into the address when they are applied, and out of it when they are cleared', async () => {
    const user = userEvent.setup()
    renderAdmin('/audit', { ...base(), [`GET ${AUDIT}?limit=50`]: page([entry]), [`GET ${AUDIT}?limit=50&action=page.intro&user=bea`]: page([entry]) })
    await screen.findByRole('table')
    expect(currentUrl()).toBe('/audit')
    await user.selectOptions(screen.getByLabelText('Kind of action'), 'page.intro')
    await user.type(screen.getByLabelText('Who (part of the email)'), ' bea ')
    expect(currentUrl()).toBe('/audit') // typing alone changes nothing: the filters are applied when asked
    await user.click(screen.getByRole('button', { name: 'Show these entries' }))
    await waitFor(() => expect(currentUrl()).toBe('/audit?action=page.intro&user=bea'))
    await user.click(await screen.findByRole('button', { name: 'Clear the filters' }))
    await waitFor(() => expect(currentUrl()).toBe('/audit'))
  })

  it('are brought back by an address that has them: shown in the form and asked of the server', async () => {
    const { calls } = renderAdmin('/audit?action=page.intro&user=bea', { ...base(), [`GET ${AUDIT}?limit=50&action=page.intro&user=bea`]: page([entry]) })
    await screen.findByRole('table')
    expect(screen.getByLabelText('Who (part of the email)')).toHaveValue('bea')
    await waitFor(() => expect(screen.getByLabelText('Kind of action')).toHaveValue('page.intro'))
    expect(calls.filter((c) => c.url.startsWith(AUDIT))).toHaveLength(1)
  })

  it('keep an action that is not in the list, so that an address is not changed behind the reader', async () => {
    renderAdmin('/audit?action=old.action', { ...base(), [`GET ${AUDIT}?limit=50&action=old.action`]: page([]) })
    await screen.findByText('Nothing in the log matches.')
    expect(screen.getByLabelText('Kind of action')).toHaveValue('old.action')
  })
})
