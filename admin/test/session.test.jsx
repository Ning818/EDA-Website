import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expectNoAxeViolations, me, renderAdmin } from './helpers'

const MINUTE = 60 * 1000
const START = new Date('2026-10-31T10:00:00Z').getTime()

const withSession = (session, over = {}) => me({ session, ...over })
const login = (over) => withSession({ idle_seconds: 7200, max_seconds_left: 43200 }, over)

// only the clock is faked: the page's own timers and the testing library's waiting stay real, and the page is told the time has moved by the focus event it listens to
const goTo = (ms) => {
  vi.setSystemTime(START + ms)
  act(() => {
    window.dispatchEvent(new Event('focus'))
  })
}

describe('the warning before the login ends', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: START })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('says nothing while there is plenty of time', async () => {
    renderAdmin('/', { 'GET /api/auth/me': { body: login() } })
    await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })
    goTo(100 * MINUTE)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('warns five minutes before an idle login ends, and staying logged in asks the server and closes the dialog', async () => {
    const user = userEvent.setup()
    let asked = 0
    const { container } = renderAdmin('/', { 'GET /api/auth/me': () => ({ body: (asked++, login()) }) })
    await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })
    expect(asked).toBe(1)
    goTo(116 * MINUTE)
    const dialog = await screen.findByRole('dialog', { name: 'Your login is about to end' })
    expect(dialog).toHaveTextContent('Your login ends at')
    expect(dialog).toHaveTextContent('because you have not done anything for a while')
    expect(dialog).toHaveTextContent('What you have typed on this page is kept')
    await expectNoAxeViolations(container)
    await user.click(screen.getByRole('button', { name: 'Stay logged in' }))
    expect(asked).toBe(2)
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('names the minute the login ends at', async () => {
    renderAdmin('/', { 'GET /api/auth/me': { body: login() } })
    await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })
    goTo(117 * MINUTE)
    const dialog = await screen.findByRole('dialog')
    const ends = new Intl.DateTimeFormat('en-GB', { timeStyle: 'short' }).format(START + 120 * MINUTE)
    expect(dialog.querySelector('strong')).toHaveTextContent(ends)
  })

  it('does not come back after "Not now", until the login has been renewed', async () => {
    const user = userEvent.setup()
    renderAdmin('/', { 'GET /api/auth/me': { body: login() } })
    await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })
    goTo(116 * MINUTE)
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Not now' })) // looked for inside the dialog: a role query over the whole page is slow
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    goTo(118 * MINUTE)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('starts the idle time again with every request the user makes', async () => {
    const user = userEvent.setup()
    renderAdmin('/', { 'GET /api/auth/me': { body: login() }, 'GET /api/admin/links/problems': { body: { problems: [], last_check: null, threshold: 3 } }, 'GET /api/admin/requests': { body: { requests: [], open: 0 } } })
    await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })
    vi.setSystemTime(START + 100 * MINUTE)
    await user.click(screen.getByRole('link', { name: /Check the broken links/ })) // the page that opens asks the server something
    await screen.findByRole('heading', { level: 1, name: 'Broken links' })
    goTo(116 * MINUTE)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument() // 16 minutes after the last request, not 116 after the login
  })

  it('tells a login that cannot be extended when it ends, and offers to log out', async () => {
    const user = userEvent.setup()
    renderAdmin('/', { 'GET /api/auth/me': { body: login({ session: { idle_seconds: 7200, max_seconds_left: 4 * 60 } }) }, 'POST /api/auth/logout': { status: 204 } })
    await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })
    goTo(1 * MINUTE)
    const dialog = await screen.findByRole('dialog', { name: 'Your login is about to end' })
    expect(dialog).toHaveTextContent('staying active will not make it last longer')
    expect(screen.queryByRole('button', { name: 'Stay logged in' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Keep working' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Log out' }))
  })

  it('logs out from the warning of a login that cannot be extended', async () => {
    const user = userEvent.setup()
    const { calls } = renderAdmin('/', { 'GET /api/auth/me': { body: login({ session: { idle_seconds: 7200, max_seconds_left: 4 * 60 } }) }, 'POST /api/auth/logout': { status: 204 } })
    await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })
    goTo(1 * MINUTE)
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Log out now' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument()
    expect(calls.some((c) => c.method === 'POST' && c.url === '/api/auth/logout')).toBe(true)
  })

  it('says nothing when the server did not say how long the login lasts', async () => {
    renderAdmin('/', { 'GET /api/auth/me': { body: me() } })
    await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })
    goTo(10 * 60 * MINUTE)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
