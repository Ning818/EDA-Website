import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expectNoAxeViolations, me, renderAdmin, unauthorized } from './helpers'

describe('the login', () => {
  it('sends someone who is not logged in to the login page, which has no accessibility violations', async () => {
    const { container } = renderAdmin('/people', { 'GET /api/auth/me': unauthorized })
    expect(await screen.findByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe('Log in - EDA Group admin'))
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Email address/)).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByLabelText(/Password/)).toHaveAttribute('autocomplete', 'current-password')
    await expectNoAxeViolations(container)
  })

  it('says what is missing in a list at the top and moves the focus to it', async () => {
    const user = userEvent.setup()
    renderAdmin('/login', { 'GET /api/auth/me': unauthorized })
    await user.click(await screen.findByRole('button', { name: 'Log in' }))
    const summary = screen.getByRole('alert')
    expect(within(summary).getByText('There are 2 problems')).toBeInTheDocument()
    expect(summary).toHaveFocus()
    expect(screen.getByLabelText(/Email address/)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(/Email address/)).toHaveAccessibleDescription(/Enter your email address/)
    // a link in the list moves the focus to its field
    await user.click(within(summary).getByRole('link', { name: 'Enter your password.' }))
    expect(screen.getByLabelText(/Password/)).toHaveFocus()
  })

  it('does not say whether the email or the password was wrong', async () => {
    const user = userEvent.setup()
    renderAdmin('/login', {
      'GET /api/auth/me': unauthorized,
      'POST /api/auth/login': { status: 401, body: { detail: 'Incorrect email or password' } },
    })
    await user.type(await screen.findByLabelText(/Email address/), 'ada@example.org')
    await user.type(screen.getByLabelText(/Password/), 'a wrong password here')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByText('The email or the password is not right.')).toBeInTheDocument()
    expect(screen.getByLabelText(/Password/)).toHaveValue('')
  })

  it('tells someone who is locked out how long to wait', async () => {
    const user = userEvent.setup()
    renderAdmin('/login', {
      'GET /api/auth/me': unauthorized,
      'POST /api/auth/login': { status: 429, body: { detail: 'Too many failed attempts. Try again in 15 minutes.' } },
    })
    await user.type(await screen.findByLabelText(/Email address/), 'ada@example.org')
    await user.type(screen.getByLabelText(/Password/), 'whatever it is')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByText('Too many failed attempts. Try again in 15 minutes.')).toBeInTheDocument()
  })

  it('goes on to the home page after a login', async () => {
    const user = userEvent.setup()
    renderAdmin('/login', {
      'GET /api/auth/me': unauthorized,
      'POST /api/auth/login': { body: me() },
    })
    await user.type(await screen.findByLabelText(/Email address/), 'ada@example.org')
    await user.type(screen.getByLabelText(/Password/), 'correct horse battery staple')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })).toBeInTheDocument()
  })

  it('shows the login page with a message when the login ends while the admin is open', async () => {
    renderAdmin('/accounts', {
      'GET /api/auth/me': { body: me() },
      'GET /api/admin/accounts': unauthorized,
    })
    expect(await screen.findByText(/Your login has ended/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument()
  })

  it('logs out', async () => {
    const user = userEvent.setup()
    const { calls } = renderAdmin('/', {
      'GET /api/auth/me': { body: me() },
      'POST /api/auth/logout': { status: 204 },
    })
    await user.click(await screen.findByRole('button', { name: 'Log out' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument()
    expect(calls.some((c) => c.method === 'POST' && c.url === '/api/auth/logout')).toBe(true)
  })
})

describe('the temporary password', () => {
  const forced = me({ must_change_password: true })

  it('sends a user on a temporary password to change it, and offers nothing else', async () => {
    const { container } = renderAdmin('/accounts', { 'GET /api/auth/me': { body: forced } })
    expect(await screen.findByRole('heading', { level: 1, name: 'Choose a password of your own' })).toBeInTheDocument()
    expect(screen.getByText(/You are using a temporary password/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'People' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Accounts' })).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Temporary password/)).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.getByLabelText(/^New password \(required\)/)).toHaveAttribute('autocomplete', 'new-password')
    await expectNoAxeViolations(container)
  })

  it('checks the new password before it asks the server', async () => {
    const user = userEvent.setup()
    const { calls } = renderAdmin('/change-password', { 'GET /api/auth/me': { body: forced } })
    await user.type(await screen.findByLabelText(/Temporary password/), 'k7mq-x3ah-p9tw')
    await user.type(screen.getByLabelText(/^New password \(required\)/), 'short')
    await user.click(screen.getByRole('button', { name: 'Change password' }))
    expect(screen.getAllByText('The new password must be at least 12 characters long.').length).toBeGreaterThan(0)
    await user.clear(screen.getByLabelText(/^New password \(required\)/))
    await user.type(screen.getByLabelText(/^New password \(required\)/), 'a long enough passphrase')
    await user.type(screen.getByLabelText(/New password again/), 'a different passphrase!')
    await user.click(screen.getByRole('button', { name: 'Change password' }))
    expect(screen.getAllByText('The two new passwords are not the same.').length).toBeGreaterThan(0)
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0)
  })

  it('shows the server\'s refusal of a wrong current password at that field', async () => {
    const user = userEvent.setup()
    renderAdmin('/change-password', {
      'GET /api/auth/me': { body: forced },
      'POST /api/auth/change-password': { status: 403, body: { detail: { code: 'current_password_wrong', message: 'The current password is not right.' } } },
    })
    await user.type(await screen.findByLabelText(/Temporary password/), 'k7mq-x3ah-p9tw')
    await user.type(screen.getByLabelText(/^New password \(required\)/), 'a long enough passphrase')
    await user.type(screen.getByLabelText(/New password again/), 'a long enough passphrase')
    await user.click(screen.getByRole('button', { name: 'Change password' }))
    expect(await screen.findByLabelText(/Temporary password/)).toHaveAccessibleDescription(/The current password is not right\./)
  })

  it('goes to the home page, with its tasks, once the password is changed', async () => {
    const user = userEvent.setup()
    let changed = false
    const { calls } = renderAdmin('/change-password', {
      'GET /api/auth/me': () => ({ body: changed ? me() : forced }),
      'POST /api/auth/change-password': () => {
        changed = true
        return { body: me() }
      },
    })
    await user.type(await screen.findByLabelText(/Temporary password/), 'k7mq-x3ah-p9tw')
    await user.type(screen.getByLabelText(/^New password \(required\)/), 'a long enough passphrase')
    await user.type(screen.getByLabelText(/New password again/), 'a long enough passphrase')
    await user.click(screen.getByRole('button', { name: 'Change password' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })).toBeInTheDocument()
    expect(screen.getByText('Your password was changed.')).toBeInTheDocument()
    const sent = JSON.parse(calls.find((c) => c.url === '/api/auth/change-password').body)
    expect(sent).toEqual({ current_password: 'k7mq-x3ah-p9tw', new_password: 'a long enough passphrase' })
    await waitFor(() => expect(screen.getByRole('link', { name: 'People' })).toBeInTheDocument())
  })
})

describe('where a login leads', () => {
  const ADA = me()
  const DEV = me({ id: 9, email: 'dev@example.org', name: 'Dev Eloper', grants: [{ area: 'system', theme: null }] })

  /** The admin as `first` has it, with the next login being `next`; `routes` are added. */
  const open = (path, first, next, routes = {}) =>
    renderAdmin(path, {
      'GET /api/auth/me': first ? { body: first } : unauthorized,
      'POST /api/auth/login': { body: next },
      'POST /api/auth/logout': { status: 204 },
      ...routes,
    })

  async function logIn(user) {
    await user.type(await screen.findByLabelText(/Email address/), 'someone@example.org')
    await user.type(screen.getByLabelText(/Password/), 'a long enough passphrase')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
  }

  it('starts another person at the home page after the first one logged out in the middle of their work', async () => {
    const user = userEvent.setup()
    open('/site', ADA, DEV)
    expect(await screen.findByRole('heading', { level: 1, name: 'Site text' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Log out' }))
    await logIn(user)
    expect(await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'You do not have access to this page' })).not.toBeInTheDocument()
  })

  it('starts the same person at the home page too after they chose to log out', async () => {
    const user = userEvent.setup()
    open('/site', ADA, ADA)
    await screen.findByRole('heading', { level: 1, name: 'Site text' })
    await user.click(screen.getByRole('button', { name: 'Log out' }))
    await logIn(user)
    expect(await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })).toBeInTheDocument()
  })

  it('takes the same person back to their page when the login ended by itself', async () => {
    const user = userEvent.setup()
    let asked = 0 // the first answer says the login has ended; once the person is logged in again the page gets its numbers
    open('/site/footer', ADA, ADA, { 'GET /api/site': () => (asked++ === 0 ? unauthorized : { body: { phone: '+39 011 090 7042', phone_dial: '+390110907042', fax: null } }) })
    expect(await screen.findByText('Your login has ended. Log in again to go on.')).toBeInTheDocument()
    await logIn(user)
    expect(await screen.findByLabelText('Phone number')).toHaveValue('+39 011 090 7042')
    expect(screen.getByRole('heading', { level: 1, name: 'Footer numbers' })).toBeInTheDocument()
  })

  it('starts another person at the home page when the login of the first ended by itself', async () => {
    const user = userEvent.setup()
    open('/site/footer', ADA, DEV, { 'GET /api/site': unauthorized })
    expect(await screen.findByText('Your login has ended. Log in again to go on.')).toBeInTheDocument()
    await logIn(user)
    expect(await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })).toBeInTheDocument()
  })

  it('takes someone who followed a link while nobody was logged in to that page', async () => {
    const user = userEvent.setup()
    open('/site', null, ADA)
    await logIn(user)
    expect(await screen.findByRole('heading', { level: 1, name: 'Site text' })).toBeInTheDocument()
  })
})

describe('the email addresses saved on this computer', () => {
  const KEY = 'eda-admin-emails'
  const saved = () => JSON.parse(localStorage.getItem(KEY) ?? '[]')
  const loginRoutes = (post = { body: me() }) => ({ 'GET /api/auth/me': unauthorized, 'POST /api/auth/login': post })

  beforeEach(() => localStorage.clear())
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  async function logIn(user, address = 'ada@example.org') {
    await user.type(await screen.findByLabelText(/Email address/), address)
    await user.type(screen.getByLabelText(/Password/), 'a long enough passphrase')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
  }

  it('lists the saved addresses for the email field, which the browser shows when it is clicked, and has no accessibility violations', async () => {
    localStorage.setItem(KEY, JSON.stringify(['ada@example.org', 'tom@example.org']))
    const { container } = renderAdmin('/login', loginRoutes())
    const field = await screen.findByLabelText(/Email address/)
    const list = container.querySelector(`datalist#${field.getAttribute('list')}`)
    expect(list).not.toBeNull()
    expect([...list.querySelectorAll('option')].map((o) => o.value)).toEqual(['ada@example.org', 'tom@example.org'])
    expect(field).toHaveAttribute('autocomplete', 'username') // the browser's own saved logins still work
    await expectNoAxeViolations(container)
  })

  it('offers nothing, and no button to forget, when nothing is saved', async () => {
    const { container } = renderAdmin('/login', loginRoutes())
    await screen.findByLabelText(/Email address/)
    expect(container.querySelectorAll('datalist option')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: /Forget the email addresses/ })).not.toBeInTheDocument()
  })

  it('saves an address that logged in, in lower case, and never the password', async () => {
    const user = userEvent.setup()
    renderAdmin('/login', loginRoutes())
    await logIn(user, 'Ada@Example.org')
    await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })
    expect(saved()).toEqual(['ada@example.org'])
    expect(JSON.stringify({ ...localStorage })).not.toContain('a long enough passphrase')
  })

  it('does not save an address whose login failed', async () => {
    const user = userEvent.setup()
    renderAdmin('/login', loginRoutes({ status: 401, body: { detail: 'Incorrect email or password' } }))
    await logIn(user)
    expect(await screen.findByText('The email or the password is not right.')).toBeInTheDocument()
    expect(saved()).toEqual([])
  })

  it('keeps the five latest, the newest first, and each address once', async () => {
    const user = userEvent.setup()
    localStorage.setItem(KEY, JSON.stringify(['e@example.org', 'd@example.org', 'c@example.org', 'b@example.org', 'a@example.org']))
    const { unmount } = renderAdmin('/login', loginRoutes())
    await logIn(user, 'f@example.org')
    await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })
    expect(saved()).toEqual(['f@example.org', 'e@example.org', 'd@example.org', 'c@example.org', 'b@example.org']) // the oldest is gone
    unmount()
    renderAdmin('/login', loginRoutes())
    await logIn(user, 'D@example.org') // one that is in the list already moves to the front
    await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })
    expect(saved()).toEqual(['d@example.org', 'f@example.org', 'e@example.org', 'c@example.org', 'b@example.org'])
  })

  it('forgets every saved address when asked, and says so', async () => {
    const user = userEvent.setup()
    localStorage.setItem(KEY, JSON.stringify(['ada@example.org']))
    const { container } = renderAdmin('/login', loginRoutes())
    await user.click(await screen.findByRole('button', { name: 'Forget the email addresses saved on this computer' }))
    expect(await screen.findByText('The saved email addresses were removed.')).toBeInTheDocument()
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(container.querySelectorAll('datalist option')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: /Forget the email addresses/ })).not.toBeInTheDocument()
  })

  it('ignores what is in the storage if it is not a list of addresses', async () => {
    localStorage.setItem(KEY, '{"not": "a list"}')
    const { container, unmount } = renderAdmin('/login', loginRoutes())
    await screen.findByLabelText(/Email address/)
    expect(container.querySelectorAll('datalist option')).toHaveLength(0)
    unmount()
    localStorage.setItem(KEY, 'not json at all')
    const again = renderAdmin('/login', loginRoutes())
    await screen.findByLabelText(/Email address/)
    expect(again.container.querySelectorAll('datalist option')).toHaveLength(0)
  })

  it('still logs in when the browser keeps nothing', async () => {
    const user = userEvent.setup()
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    renderAdmin('/login', loginRoutes())
    await logIn(user)
    expect(await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })).toBeInTheDocument()
  })
})

