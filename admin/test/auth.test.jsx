import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { expectNoAxeViolations, me, renderAdmin, unauthorized } from './helpers'

describe('the login', () => {
  it('sends someone who is not logged in to the login page, which has no accessibility violations', async () => {
    const { container } = renderAdmin('/people', { 'GET /api/auth/me': unauthorized })
    expect(await screen.findByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument()
    expect(document.title).toBe('Log in - EDA Group admin')
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
