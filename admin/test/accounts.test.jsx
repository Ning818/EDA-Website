import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PROJECTS_OWNER, THEME_OWNER, account, expectNoAxeViolations, me, renderAdmin } from './helpers'

const list = [
  me(),
  account(),
  account({ id: 3, email: 'pia@example.org', name: 'Pia Bianchi', preset: 'projects-owner', grants: PROJECTS_OWNER, must_change_password: true }),
  account({ id: 4, email: 'off@example.org', name: 'Olga Off', is_active: false, preset: null, grants: [] }),
].map((a) => ({ created_at: '2026-10-27T10:00:00Z', last_login_at: null, is_active: true, must_change_password: false, preset: 'administrative', ...a }))

const base = (extra = {}) => ({ 'GET /api/auth/me': { body: me() }, 'GET /api/admin/accounts': { body: list }, ...extra })

describe('the accounts', () => {
  it('lists them in a table with a caption, and says what each may do and in what state, in words', async () => {
    const { container } = renderAdmin('/accounts', base())
    const table = await screen.findByRole('table', { name: '4 accounts' })
    expect(within(table).getByRole('columnheader', { name: 'What they may do' })).toBeInTheDocument()
    const rows = within(table).getAllByRole('row')
    expect(within(rows[1]).getByRole('rowheader')).toHaveTextContent('Ada Lovelace (you)')
    expect(within(rows[2]).getByText('Theme owner')).toBeInTheDocument()
    expect(within(rows[3]).getByText('Temporary password')).toBeInTheDocument()
    expect(within(rows[3]).getByText('Projects owner')).toBeInTheDocument()
    expect(within(rows[4]).getByText('Switched off')).toBeInTheDocument()
    expect(within(rows[4]).getByText('No access')).toBeInTheDocument()
    // a link says whose account it opens, not only "Change"
    expect(within(rows[2]).getByRole('link', { name: 'Change the account of Tom Rossi' })).toHaveAttribute('href', '/accounts/2')
    await expectNoAxeViolations(container)
  })

  it('is not offered to a user who may not manage accounts', async () => {
    renderAdmin('/accounts', { 'GET /api/auth/me': { body: me({ grants: THEME_OWNER }) } })
    expect(await screen.findByRole('heading', { level: 1, name: 'You do not have access to this page' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Accounts' })).not.toBeInTheDocument()
  })
})

describe('making an account', () => {
  it('has no accessibility violations and checks the form before asking the server', async () => {
    const user = userEvent.setup()
    const { container, calls } = renderAdmin('/accounts/new', base())
    expect(await screen.findByRole('heading', { level: 1, name: 'Make a new account' })).toBeInTheDocument()
    await expectNoAxeViolations(container)
    await user.type(screen.getByLabelText(/Email address/), 'not an email')
    await user.click(screen.getByRole('button', { name: 'Make the account' }))
    expect(screen.getByText('There are 3 problems')).toBeInTheDocument()
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0)
  })

  it('describes what the chosen access allows', async () => {
    const user = userEvent.setup()
    renderAdmin('/accounts/new', base())
    await user.selectOptions(await screen.findByLabelText(/What this person may do/), 'projects-owner')
    expect(screen.getByLabelText(/What this person may do/)).toHaveAccessibleDescription('Updates the funded projects.')
  })

  it('shows the temporary password once, with how to pass it on, after the account is made', async () => {
    const user = userEvent.setup()
    const { calls } = renderAdmin(
      '/accounts/new',
      base({ 'POST /api/admin/accounts': { status: 201, body: { account: account({ id: 5, email: 'new@example.org', name: 'New Person' }), temporary_password: 'k7mq-x3ah-p9tw' } } }),
    )
    await user.type(await screen.findByLabelText(/Email address/), 'new@example.org')
    await user.type(screen.getByLabelText(/Full name/), 'New Person')
    await user.selectOptions(screen.getByLabelText(/What this person may do/), 'theme-owner')
    await user.click(screen.getByRole('button', { name: 'Make the account' }))
    expect(await screen.findByText('k7mq-x3ah-p9tw')).toBeInTheDocument()
    expect(screen.getByText('It is shown only once.')).toBeInTheDocument()
    expect(JSON.parse(calls.find((c) => c.method === 'POST').body)).toEqual({ email: 'new@example.org', name: 'New Person', preset: 'theme-owner' })
    // the copy button reports what happened in words
    await user.click(screen.getByRole('button', { name: 'Copy the password' }))
    expect(await screen.findByText('The password was copied.')).toBeInTheDocument()
    expect(await navigator.clipboard.readText()).toBe('k7mq-x3ah-p9tw')
  })

  it('does not offer an account with no access', async () => {
    renderAdmin('/accounts/new', base())
    const select = await screen.findByLabelText(/What this person may do/)
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual(['Choose…', 'Administrative staff', 'Theme owner', 'Projects owner', 'Developer'])
  })

  it('asks to choose what the person may do', async () => {
    const user = userEvent.setup()
    const { calls } = renderAdmin('/accounts/new', base())
    await user.type(await screen.findByLabelText(/Email address/), 'new@example.org')
    await user.type(screen.getByLabelText(/Full name/), 'New Person')
    await user.click(screen.getByRole('button', { name: 'Make the account' }))
    expect(screen.getByLabelText(/What this person may do/)).toHaveAccessibleDescription(/Choose what this person may do\./)
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0)
  })

  it('puts a taken email at its field', async () => {
    const user = userEvent.setup()
    renderAdmin('/accounts/new', base({ 'POST /api/admin/accounts': { status: 409, body: { detail: { code: 'email_taken', message: 'There is an account with that email already.' } } } }))
    await user.type(await screen.findByLabelText(/Email address/), 'tom@example.org')
    await user.type(screen.getByLabelText(/Full name/), 'Tom')
    await user.selectOptions(screen.getByLabelText(/What this person may do/), 'theme-owner')
    await user.click(screen.getByRole('button', { name: 'Make the account' }))
    expect(await screen.findByLabelText(/Email address/)).toHaveAccessibleDescription(/account with that email already/)
  })
})

describe('changing an account', () => {
  it('has no accessibility violations and shows what the account may do now', async () => {
    const { container } = renderAdmin('/accounts/2', base())
    expect(await screen.findByRole('heading', { level: 1, name: 'Tom Rossi' })).toBeInTheDocument()
    expect(screen.getByText(/Now:/)).toHaveTextContent('Now: Theme owner (Add people, Theme-related changes).')
    await expectNoAxeViolations(container)
  })

  it('offers no way to switch off or change the access of one\'s own account', async () => {
    renderAdmin('/accounts/1', base())
    expect(await screen.findByRole('heading', { level: 1, name: 'Ada Lovelace' })).toBeInTheDocument()
    expect(screen.getByText(/This is your own account/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Switch the account off/ })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Change it to/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /new temporary password/ })).not.toBeInTheDocument()
  })

  it('changes the access', async () => {
    const user = userEvent.setup()
    const { calls } = renderAdmin('/accounts/2', base({ 'PATCH /api/admin/accounts/2': { body: account({ preset: 'projects-owner', grants: PROJECTS_OWNER }) } }))
    await user.selectOptions(await screen.findByLabelText(/Change it to/), 'projects-owner')
    await user.click(screen.getByRole('button', { name: 'Save what they may do' }))
    expect(JSON.parse(calls.find((c) => c.method === 'PATCH').body)).toEqual({ preset: 'projects-owner' })
    expect(await screen.findByText('What the person may do was changed.')).toBeInTheDocument()
  })

  it('asks before switching an account off, and does nothing if cancelled', async () => {
    const user = userEvent.setup()
    const { calls } = renderAdmin('/accounts/2', base({ 'PATCH /api/admin/accounts/2': { body: account({ is_active: false }) } }))
    await user.click(await screen.findByRole('button', { name: 'Switch the account off…' }))
    const dialog = await screen.findByRole('dialog', { name: 'Switch off the account of Tom Rossi?' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Switch the account off…' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Switch the account off' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(1))
    expect(JSON.parse(calls.find((c) => c.method === 'PATCH').body)).toEqual({ is_active: false })
    expect(await screen.findByText('The account was switched off.')).toBeInTheDocument()
  })

  it('shows the new temporary password once after a reset', async () => {
    const user = userEvent.setup()
    renderAdmin('/accounts/2', base({ 'POST /api/admin/accounts/2/reset-password': { body: { account: account({ must_change_password: true }), temporary_password: 'n3wp-a55w-0rdq' } } }))
    await user.click(await screen.findByRole('button', { name: 'Give a new temporary password…' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Give a new temporary password' }))
    expect(await screen.findByText('n3wp-a55w-0rdq')).toBeInTheDocument()
    expect(screen.getByText('A new temporary password was set')).toBeInTheDocument()
  })

  it('says when there is no such account', async () => {
    renderAdmin('/accounts/99', base())
    expect(await screen.findByRole('heading', { level: 1, name: 'Account not found' })).toBeInTheDocument()
  })

  it('shows a refusal of the server in words', async () => {
    const user = userEvent.setup()
    renderAdmin('/accounts/2', base({ 'PATCH /api/admin/accounts/2': { status: 409, body: { detail: { code: 'last_account_manager', message: 'At least one active account must be able to manage accounts.' } } } }))
    await user.selectOptions(await screen.findByLabelText(/Change it to/), 'projects-owner')
    await user.click(screen.getByRole('button', { name: 'Save what they may do' }))
    expect(await screen.findByText('At least one active account must be able to manage accounts.')).toBeInTheDocument()
  })
})
