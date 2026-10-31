import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { THEME_OWNER, expectNoAxeViolations, me, renderAdmin } from './helpers'

const staff = () => ({ 'GET /api/auth/me': { body: me() } })
const SITE = { phone: '+39 011 090 7042', phone_dial: '+390110907042', fax: '+39 011 090 7099' }

describe('the site text', () => {
  it('offers the two tasks, and has no accessibility violations', async () => {
    const { container } = renderAdmin('/site', staff())
    expect(await screen.findByRole('heading', { level: 1, name: 'Site text' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Footer numbers/ })).toHaveAttribute('href', '/site/footer')
    expect(screen.getByRole('link', { name: /Page introductions/ })).toHaveAttribute('href', '/site/intros')
    await expectNoAxeViolations(container)
  })

  it('is open to the administrative staff and shown in their navigation, and to no one else', async () => {
    renderAdmin('/site', { 'GET /api/auth/me': { body: me({ grants: THEME_OWNER }) } })
    expect(await screen.findByRole('heading', { level: 1, name: 'You do not have access to this page' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Site text' })).not.toBeInTheDocument()
  })

  it('has the site text and the collaborations in the navigation of the administrative staff', async () => {
    renderAdmin('/site', staff())
    await screen.findByRole('heading', { level: 1, name: 'Site text' })
    const navigation = screen.getByRole('navigation', { name: 'Main' })
    expect(navigation).toHaveTextContent('Collaborations')
    expect(navigation).toHaveTextContent('Site text')
    expect(navigation).not.toHaveTextContent('Funded projects')
  })
})

describe('the footer numbers', () => {
  const open = (extra = {}) => renderAdmin('/site/footer', { ...staff(), 'GET /api/site': { body: SITE }, ...extra })

  it('shows the numbers as they are and what the phone link dials, and has no accessibility violations', async () => {
    const { container } = open()
    expect(await screen.findByRole('heading', { level: 1, name: 'Footer numbers' })).toBeInTheDocument()
    expect(await screen.findByLabelText('Phone number')).toHaveValue('+39 011 090 7042')
    expect(screen.getByLabelText('Fax number')).toHaveValue('+39 011 090 7099')
    expect(screen.getByText('Visitors who tap the phone number dial +390110907042.')).toBeInTheDocument()
    await expectNoAxeViolations(container)
  })

  it('sends only the number that was changed, and says what the footer shows', async () => {
    const user = userEvent.setup()
    const { calls } = open({ 'PATCH /api/admin/site/contact': { body: { ...SITE, phone: '+39 011 090 1234', phone_dial: '+390110901234' } } })
    const phone = await screen.findByLabelText('Phone number')
    await user.clear(phone)
    await user.type(phone, '+39 011 090 1234')
    expect(screen.getByText('Visitors who tap the phone number dial +390110901234.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save the numbers' }))
    expect(await screen.findByText('The footer now shows the new numbers.')).toBeInTheDocument()
    expect(JSON.parse(calls.find((c) => c.method === 'PATCH').body)).toEqual({ phone: '+39 011 090 1234' })
  })

  it('sends a number that was emptied as null, which takes the line out of the footer', async () => {
    const user = userEvent.setup()
    const { calls } = open({ 'PATCH /api/admin/site/contact': { body: { ...SITE, fax: null } } })
    await user.clear(await screen.findByLabelText('Fax number'))
    await user.click(screen.getByRole('button', { name: 'Save the numbers' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(1))
    expect(JSON.parse(calls.find((c) => c.method === 'PATCH').body)).toEqual({ fax: null })
  })

  it.each(['abc', '12345', '0110905678; DROP', '011+090 5678', '+39 011 090 56789 0123'])('refuses %s before asking the server, because a visitor dials it', async (number) => {
    const user = userEvent.setup()
    const { calls } = open()
    const phone = await screen.findByLabelText('Phone number')
    await user.clear(phone)
    await user.type(phone, number)
    await user.click(screen.getByRole('button', { name: 'Save the numbers' }))
    expect(screen.getByLabelText('Phone number')).toHaveAccessibleDescription(/must be a phone number/)
    expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(0)
  })

  it('says so when nothing was changed, without asking the server', async () => {
    const user = userEvent.setup()
    const { calls } = open()
    await user.click(await screen.findByRole('button', { name: 'Save the numbers' }))
    expect(screen.getByText('Nothing was changed.')).toBeInTheDocument()
    expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(0)
  })

  it('puts a refusal of the server at its field', async () => {
    const user = userEvent.setup()
    open({ 'PATCH /api/admin/site/contact': { status: 422, body: { detail: { code: 'invalid_input', field: 'fax', message: 'The fax number must be a phone number.' } } } })
    const fax = await screen.findByLabelText('Fax number')
    await user.clear(fax)
    await user.type(fax, '011 090 0000')
    await user.click(screen.getByRole('button', { name: 'Save the numbers' }))
    await waitFor(() => expect(screen.getByLabelText('Fax number')).toHaveAccessibleDescription(/The fax number must be a phone number/))
  })

  it('says so when the numbers cannot be loaded', async () => {
    renderAdmin('/site/footer', { ...staff(), 'GET /api/site': { status: 503, body: { detail: 'Database unreachable' } } })
    expect(await screen.findByText('Could not load this page')).toBeInTheDocument()
  })
})

describe('the page introductions', () => {
  const PAGES = { 'GET /api/pages/people': { body: { slug: 'people', intro: 'The people of the group.' } }, 'GET /api/pages/collaborations': { body: { slug: 'collaborations', intro: 'Who we work with.' } } }
  const open = (extra = {}) => renderAdmin('/site/intros', { ...staff(), ...PAGES, ...extra })

  it('shows the paragraph of each page with its length, and has no accessibility violations', async () => {
    const { container } = open()
    expect(await screen.findByRole('heading', { level: 1, name: 'Page introductions' })).toBeInTheDocument()
    expect(await screen.findByLabelText(/Paragraph under the title of the People page/)).toHaveValue('The people of the group.')
    expect(screen.getByLabelText(/Paragraph under the title of the Collaborations page/)).toHaveValue('Who we work with.')
    expect(screen.getByText('24 of 1000 characters.')).toBeInTheDocument()
    await expectNoAxeViolations(container)
  })

  it('saves the paragraph of one page on its own', async () => {
    const user = userEvent.setup()
    const { calls } = open({ 'PUT /api/admin/site/pages/people': { body: { slug: 'people', intro: 'A new paragraph.' } } })
    const text = await screen.findByLabelText(/Paragraph under the title of the People page/)
    await user.clear(text)
    await user.type(text, '  A new   paragraph. ')
    await user.click(screen.getAllByRole('button', { name: 'Save the paragraph' })[0])
    expect(await screen.findByText('The paragraph of the People page was saved.')).toBeInTheDocument()
    expect(JSON.parse(calls.find((c) => c.method === 'PUT').body)).toEqual({ intro: 'A new paragraph.' })
    expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(1)
    expect(screen.getByLabelText(/Paragraph under the title of the People page/)).toHaveValue('A new paragraph.') // as the API keeps it, spaces tidied
    expect(screen.getByLabelText(/Paragraph under the title of the Collaborations page/)).toHaveValue('Who we work with.')
  })

  it('refuses an empty paragraph and one that is too long before asking the server', async () => {
    const user = userEvent.setup()
    const { calls } = open()
    const text = await screen.findByLabelText(/Paragraph under the title of the People page/)
    await user.clear(text)
    await user.click(screen.getAllByRole('button', { name: 'Save the paragraph' })[0])
    expect(screen.getByLabelText(/Paragraph under the title of the People page/)).toHaveAccessibleDescription(/Write the paragraph/)
    await user.click(text)
    await user.paste('x'.repeat(1001))
    await user.click(screen.getAllByRole('button', { name: 'Save the paragraph' })[0])
    expect(screen.getByLabelText(/Paragraph under the title of the People page/)).toHaveAccessibleDescription(/at most 1000 characters/)
    expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(0)
  })

  it('says so when nothing was changed, without asking the server', async () => {
    const user = userEvent.setup()
    const { calls } = open()
    await screen.findByLabelText(/Paragraph under the title of the People page/)
    await user.click(screen.getAllByRole('button', { name: 'Save the paragraph' })[1])
    expect(screen.getByText('Nothing was changed.')).toBeInTheDocument()
    expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(0)
  })

  it('puts a refusal of the server at the paragraph', async () => {
    const user = userEvent.setup()
    open({ 'PUT /api/admin/site/pages/people': { status: 422, body: { detail: { code: 'invalid_input', field: 'intro', message: 'The paragraph must be plain text, without < or >.' } } } })
    const text = await screen.findByLabelText(/Paragraph under the title of the People page/)
    await user.type(text, ' more')
    await user.click(screen.getAllByRole('button', { name: 'Save the paragraph' })[0])
    await waitFor(() => expect(screen.getByLabelText(/Paragraph under the title of the People page/)).toHaveAccessibleDescription(/plain text/))
  })

  it('says so when a paragraph cannot be loaded, and still shows the other', async () => {
    open({ 'GET /api/pages/people': { status: 503, body: { detail: 'Database unreachable' } } })
    expect(await screen.findByText('Could not load this page')).toBeInTheDocument()
    expect(await screen.findByLabelText(/Paragraph under the title of the Collaborations page/)).toHaveValue('Who we work with.')
  })
})
