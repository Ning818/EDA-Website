import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ADMINISTRATIVE, DEVELOPER, THEME_OWNER, expectNoAxeViolations, me, renderAdmin } from './helpers'

const REQUESTS = '/api/admin/requests'

const request = (over = {}) => ({
  id: 1,
  user_name: 'Tom Rossi',
  user_email: 'tom@example.org',
  message: 'I need to change the colours of a theme.',
  page: '/themes/smart-city',
  status: 'open',
  answer: null,
  created_at: '2026-10-30T09:00:00Z',
  handled_at: null,
  handled_by: null,
  ...over,
})

const list = (requests) => ({ body: { requests, open: requests.filter((r) => r.status === 'open').length } })
const developer = () => ({ 'GET /api/auth/me': { body: me({ name: 'Dev Eloper', grants: DEVELOPER }) } })
const staff = () => ({ 'GET /api/auth/me': { body: me({ grants: ADMINISTRATIVE }) } })
const tom = () => ({ 'GET /api/auth/me': { body: me({ name: 'Tom Rossi', grants: THEME_OWNER }) } })

describe('the "I can\'t find what I need" page', () => {
  it('is reached from the foot of every page, which says where the user came from', async () => {
    renderAdmin('/', { ...staff() })
    expect(await screen.findByRole('heading', { level: 1, name: 'What would you like to do?' })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toContainElement(screen.getByRole('link', { name: "I can't find what I need" }))
    expect(screen.getByRole('link', { name: "I can't find what I need" })).toHaveAttribute('href', '/help?from=%2F')
    expect(screen.queryByText(/Cannot find what you need/)).not.toBeInTheDocument() // the link at the foot of the page is the one way in, on Home too
  })

  it('has no link to itself at the foot of its own page', async () => {
    renderAdmin('/help', { ...tom(), [`GET ${REQUESTS}/mine`]: list([]) })
    await screen.findByRole('heading', { level: 1, name: "I can't find what I need" })
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: "I can't find what I need" })).not.toBeInTheDocument()
  })

  it('is closed to an account with no grants, which is not offered it either', async () => {
    renderAdmin('/help', { 'GET /api/auth/me': { body: me({ grants: [] }) } })
    expect(await screen.findByRole('heading', { level: 1, name: 'You do not have access to this page' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: "I can't find what I need" })).not.toBeInTheDocument()
  })

  it('has no link at the foot while the user must change a temporary password', async () => {
    renderAdmin('/change-password', { 'GET /api/auth/me': { body: me({ must_change_password: true }) } })
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('link', { name: "I can't find what I need" })).not.toBeInTheDocument()
  })

  it('sends the request with the page it came from, then shows it among the requests, and has no accessibility violations', async () => {
    const user = userEvent.setup()
    let asked = false
    const sent = request({ id: 4, message: 'I need a new kind of card.' })
    const { calls, container } = renderAdmin('/help?from=%2Fthemes%2Fsmart-city', {
      ...tom(),
      [`GET ${REQUESTS}/mine`]: () => list(asked ? [sent] : []),
      [`POST ${REQUESTS}`]: () => {
        asked = true
        return { status: 201, body: sent }
      },
    })
    expect(await screen.findByRole('heading', { level: 1, name: "I can't find what I need" })).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe("I can't find what I need - EDA Group admin"))
    expect(await screen.findByText('You have not asked for anything yet.')).toBeInTheDocument()
    expect(screen.getByText('The request will say that you were on the page /themes/smart-city.')).toBeInTheDocument()
    await expectNoAxeViolations(container)
    await user.type(screen.getByLabelText(/What do you need\?/), 'I need a new kind of card.')
    await user.click(screen.getByRole('button', { name: 'Send the request' }))
    expect(await screen.findByText(/Your request was sent/)).toBeInTheDocument()
    expect(await screen.findByText('I need a new kind of card.')).toBeInTheDocument()
    expect(screen.getByText('Waiting for an answer')).toBeInTheDocument()
    expect(JSON.parse(calls.find((c) => c.method === 'POST').body)).toEqual({ message: 'I need a new kind of card.', page: '/themes/smart-city' })
    expect(screen.getByLabelText(/What do you need\?/)).toHaveValue('')
  })

  it('does not trust a page that is not a path of the admin', async () => {
    renderAdmin('/help?from=https%3A%2F%2Fevil.example%2Fx', { ...tom(), [`GET ${REQUESTS}/mine`]: list([]) })
    await screen.findByLabelText(/What do you need\?/)
    expect(screen.queryByText(/you were on the page/)).not.toBeInTheDocument()
  })

  it('will not send an empty request, and puts the problem at the field', async () => {
    const user = userEvent.setup()
    const { calls } = renderAdmin('/help', { ...tom(), [`GET ${REQUESTS}/mine`]: list([]) })
    await user.click(await screen.findByRole('button', { name: 'Send the request' }))
    expect(screen.getByLabelText(/What do you need\?/)).toHaveAccessibleDescription(/The request is empty/)
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0)
  })

  it('will not send text with angle brackets', async () => {
    const user = userEvent.setup()
    const { calls } = renderAdmin('/help', { ...tom(), [`GET ${REQUESTS}/mine`]: list([]) })
    await user.type(await screen.findByLabelText(/What do you need\?/), 'a <b> request')
    await user.click(screen.getByRole('button', { name: 'Send the request' }))
    expect(screen.getByLabelText(/What do you need\?/)).toHaveAccessibleDescription(/without < or >/)
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0)
  })

  it('says why the server refused', async () => {
    const user = userEvent.setup()
    renderAdmin('/help', {
      ...tom(),
      [`GET ${REQUESTS}/mine`]: list([]),
      [`POST ${REQUESTS}`]: { status: 409, body: { detail: { code: 'too_many_open', message: 'You have 5 requests that have not been answered yet. Wait for an answer before asking for more.' } } },
    })
    await user.type(await screen.findByLabelText(/What do you need\?/), 'One more');
    await user.click(screen.getByRole('button', { name: 'Send the request' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('You have 5 requests that have not been answered yet.')
  })

  it("shows the staff's answer to a request", async () => {
    renderAdmin('/help', {
      ...tom(),
      [`GET ${REQUESTS}/mine`]: list([
        request({ id: 2, status: 'done', answer: 'The colours are kept in the code; I have told the developer.', handled_at: '2026-10-31T08:00:00Z', handled_by: 'ada@example.org' }),
        request({ id: 1, message: 'A second thing.' }),
      ]),
    })
    expect(await screen.findByText(/The colours are kept in the code/)).toBeInTheDocument()
    expect(screen.getByText('Answered')).toBeInTheDocument()
    expect(screen.getByText('Waiting for an answer')).toBeInTheDocument()
  })
})

describe('the requests of the developer', () => {
  const waitingAndDone = [
    request(),
    request({ id: 2, user_name: 'Pia Bianchi', user_email: 'pia@example.org', message: 'Where do I add a project?', page: null }),
    request({ id: 3, user_name: 'Sam Verdi', user_email: 'sam@example.org', message: 'An old one.', status: 'done', answer: 'Done by hand.', handled_at: '2026-10-29T10:00:00Z', handled_by: 'ada@example.org' }),
  ]

  it('lists the waiting requests and the answered ones, and has no accessibility violations', async () => {
    const { container } = renderAdmin('/requests', { ...developer(), [`GET ${REQUESTS}`]: list(waitingAndDone) })
    expect(await screen.findByRole('heading', { level: 1, name: 'Requests' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 2, name: /Waiting for an answer\s*\(2\)/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Answered\s*\(1\)/ })).toBeInTheDocument()
    const first = screen.getByRole('heading', { level: 3, name: 'Tom Rossi' }).closest('li')
    expect(first).toHaveTextContent('tom@example.org, asked 30 October 2026')
    expect(first).toHaveTextContent('from the page /themes/smart-city')
    expect(first).toHaveTextContent('I need to change the colours of a theme.')
    expect(screen.getByRole('heading', { level: 3, name: 'Sam Verdi' }).closest('li')).toHaveTextContent('Done by hand.')
    await expectNoAxeViolations(container)
  })

  it('says so when no request is waiting', async () => {
    renderAdmin('/requests', { ...developer(), [`GET ${REQUESTS}`]: list([]) })
    expect(await screen.findByText('No request is waiting.')).toBeInTheDocument()
  })

  it('answers a request in a dialog and marks it as answered', async () => {
    const user = userEvent.setup()
    let closed = false
    const { calls } = renderAdmin('/requests', {
      ...developer(),
      [`GET ${REQUESTS}`]: () => list(closed ? waitingAndDone.filter((r) => r.id !== 1) : waitingAndDone),
      [`POST ${REQUESTS}/1/close`]: () => {
        closed = true
        return { body: request({ status: 'done', answer: 'I have told the developer.' }) }
      },
    })
    await user.click(await screen.findByRole('button', { name: 'Answer it: the request of Tom Rossi' }))
    const dialog = await screen.findByRole('dialog', { name: 'Answer the request of Tom Rossi' })
    expect(within(dialog).getByText('I need to change the colours of a theme.')).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText('Your answer'), 'I have told the developer.')
    await user.click(within(dialog).getByRole('button', { name: 'Mark as answered' }))
    expect(await screen.findByText('The request of Tom Rossi is marked as answered.')).toBeInTheDocument()
    expect(JSON.parse(calls.find((c) => c.method === 'POST').body)).toEqual({ answer: 'I have told the developer.' })
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Answer it: the request of Tom Rossi' })).not.toBeInTheDocument())
  })

  it('may mark a request as answered without an answer', async () => {
    const user = userEvent.setup()
    const { calls } = renderAdmin('/requests', { ...developer(), [`GET ${REQUESTS}`]: list(waitingAndDone), [`POST ${REQUESTS}/2/close`]: { body: request({ id: 2, status: 'done' }) } })
    await user.click(await screen.findByRole('button', { name: 'Answer it: the request of Pia Bianchi' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Mark as answered' }))
    await screen.findByText('The request of Pia Bianchi is marked as answered.')
    expect(JSON.parse(calls.find((c) => c.method === 'POST').body)).toEqual({ answer: null })
  })

  it('shows what the server refused inside the dialog and keeps it open', async () => {
    const user = userEvent.setup()
    renderAdmin('/requests', {
      ...developer(),
      [`GET ${REQUESTS}`]: list(waitingAndDone),
      [`POST ${REQUESTS}/1/close`]: { status: 409, body: { detail: { code: 'already_done', message: 'This request has been answered already.' } } },
    })
    await user.click(await screen.findByRole('button', { name: 'Answer it: the request of Tom Rossi' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Mark as answered' }))
    expect(await within(dialog).findByText('This request has been answered already.')).toBeInTheDocument()
  })

  it('is in the navigation of the developer only', async () => {
    renderAdmin('/requests', { ...developer(), [`GET ${REQUESTS}`]: list([]) })
    await screen.findByRole('heading', { level: 1, name: 'Requests' })
    expect(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Requests' })).toHaveAttribute('href', '/requests')
  })

  it('is closed to the administrative staff, and to everyone else', async () => {
    renderAdmin('/requests', staff())
    expect(await screen.findByRole('heading', { level: 1, name: 'You do not have access to this page' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Requests' })).not.toBeInTheDocument()
  })

  it('is closed to a theme owner', async () => {
    renderAdmin('/requests', tom())
    expect(await screen.findByRole('heading', { level: 1, name: 'You do not have access to this page' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Requests' })).not.toBeInTheDocument()
  })
})
