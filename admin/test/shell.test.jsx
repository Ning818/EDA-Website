import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PROJECTS_OWNER, THEME_OWNER, expectNoAxeViolations, me, person, renderAdmin } from './helpers'

describe('the home page', () => {
  it('offers the tasks the user\'s grants allow, and has no accessibility violations', async () => {
    const { container } = renderAdmin('/', { 'GET /api/auth/me': { body: me() } })
    expect(await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })).toBeInTheDocument()
    const tasks = screen.getByRole('list', { name: 'Things you can do' })
    expect(tasks).toHaveTextContent('Add a new person')
    expect(tasks).toHaveTextContent('Find or update a person')
    expect(tasks).toHaveTextContent('Manage accounts')
    expect(screen.getByRole('link', { name: /Add a new person/ })).toHaveAttribute('href', '/people/new')
    expect(screen.getByRole('link', { name: /Update the collaborations/ })).toHaveAttribute('href', '/collaborations')
    expect(screen.getByRole('link', { name: /Change the footer numbers/ })).toHaveAttribute('href', '/site/footer')
    expect(screen.getByRole('link', { name: /Change a page introduction/ })).toHaveAttribute('href', '/site/intros')
    expect(screen.queryByRole('link', { name: /Keep the funded projects/ })).not.toBeInTheDocument() // the administrative staff do not keep them
    await expectNoAxeViolations(container)
  })

  it('shows the theme owner the tasks that exist and says which ones are still to come', async () => {
    renderAdmin('/', { 'GET /api/auth/me': { body: me({ grants: THEME_OWNER }) } })
    await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })
    expect(screen.getByRole('link', { name: /Add a new person/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Manage accounts/ })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Coming soon' })).toBeInTheDocument()
    expect(screen.getByText('Edit the theme pages')).toBeInTheDocument()
  })

  it('offers a user who may only keep the funded projects that task and nothing else', async () => {
    renderAdmin('/', { 'GET /api/auth/me': { body: me({ grants: PROJECTS_OWNER }) } })
    await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })
    const tasks = screen.getByRole('list', { name: 'Things you can do' })
    expect(within(tasks).getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByRole('link', { name: /Keep the funded projects/ })).toHaveAttribute('href', '/projects')
    expect(screen.queryByRole('heading', { name: 'Coming soon' })).not.toBeInTheDocument()
  })

  it('tells a user with no grants to ask for access', async () => {
    renderAdmin('/', { 'GET /api/auth/me': { body: me({ grants: [] }) } })
    expect(await screen.findByText(/not allowed to do anything in the admin yet/)).toBeInTheDocument()
  })
})

describe('moving around', () => {
  it('puts the focus on the new page\'s heading and sets the title when the page changes', async () => {
    const user = userEvent.setup()
    renderAdmin('/', { 'GET /api/auth/me': { body: me() }, 'GET /api/people': { body: [person()] } })
    await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })
    expect(document.title).toBe('Home - EDA Group admin')
    await user.click(screen.getByRole('link', { name: 'People' }))
    const heading = await screen.findByRole('heading', { level: 1, name: 'People' })
    expect(heading).toHaveFocus()
    expect(document.title).toBe('People - EDA Group admin')
  })

  it('marks the page the user is on in the navigation', async () => {
    renderAdmin('/people', { 'GET /api/auth/me': { body: me() }, 'GET /api/people': { body: [person()] } })
    await screen.findByRole('heading', { level: 1, name: 'People' })
    expect(screen.getByRole('link', { name: 'People' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')
  })

  it('has a main landmark, a labelled navigation and a banner on every page', async () => {
    renderAdmin('/', { 'GET /api/auth/me': { body: me() } })
    await screen.findByRole('heading', { level: 1 })
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('shows a page that does not exist as such, with a way back', async () => {
    renderAdmin('/nothing-here', { 'GET /api/auth/me': { body: me() } })
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the home page' })).toHaveAttribute('href', '/')
  })

  it('says so when the server cannot be reached, and tries again', async () => {
    const user = userEvent.setup()
    let down = true
    renderAdmin('/', { 'GET /api/auth/me': () => (down ? { status: 503, body: { detail: 'Database unreachable' } } : { body: me() }) })
    expect(await screen.findByText('Could not load this page')).toBeInTheDocument()
    down = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })).toBeInTheDocument()
  })
})
