import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEVELOPER, expectNoAxeViolations, me, renderAdmin } from './helpers'

describe('a page that breaks', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {}) // the break is on purpose: keep its report out of the test output
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // an answer of an older API than the page expects: the page cannot draw it
  const oldApi = () => ({
    'GET /api/auth/me': { body: me({ grants: DEVELOPER }) },
    'GET /api/admin/system': {
      body: {
        server_time: '2026-10-31T10:00:00Z',
        database: { ok: true, migration: 'abc' },
        links: { last_check: null, stale: true, stale_after_days: 3, total: 0, ok: 0, broken: 0, blocked: 0, unchecked: 0, reported: 0, threshold: 3 },
        media: { files: 0, bytes: 0 },
        accounts: { total: 1, active: 1, on_temporary_password: 0 },
        requests_open: 0,
        content: { people: 1, themes: 1, projects: 1, collaborators: 1, joint_projects: 1 },
      },
    },
  })

  it('says so and offers a way out, instead of showing a blank screen, and has no accessibility violations', async () => {
    const { container } = renderAdmin('/system', oldApi())
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Something went wrong on this page')
    expect(alert).toHaveTextContent('Reload it')
    expect(screen.getByRole('link', { name: 'Back to the home page' })).toHaveAttribute('href', '/')
    // the frame is still there: the navigation and the log out button work
    expect(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'System' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
    await expectNoAxeViolations(container)
  })

  it('starts again on another page', async () => {
    const user = userEvent.setup()
    renderAdmin('/system', { ...oldApi(), 'GET /api/admin/requests': { body: { requests: [], open: 0 } } })
    await screen.findByText('Something went wrong on this page')
    await user.click(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Requests' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Requests' })).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong on this page')).not.toBeInTheDocument()
  })
})
