import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { THEME_OWNER, expectNoAxeViolations, me, renderAdmin } from './helpers'

const SOCIAL = '/api/site/social'

const blocks = () => [
  { slug: 'youtube', label: 'YouTube', text: 'The YouTube text of the home page.', cta: 'Explore our YouTube channel', url: 'https://www.youtube.com/@edagroup' },
  { slug: 'linkedin', label: 'LinkedIn', text: 'The LinkedIn text of the home page.', cta: 'Explore our updates on LinkedIn', url: 'https://www.linkedin.com/company/edagroup/' },
]
const staff = (extra = {}) => ({ 'GET /api/auth/me': { body: me() }, [`GET ${SOCIAL}`]: { body: blocks() }, ...extra })
const block = (name) => screen.getByRole('heading', { level: 2, name: `${name} block` }).closest('section')

describe('the social media page', () => {
  it('shows the two blocks as they are, and has no accessibility violations', async () => {
    const { container } = renderAdmin('/site/social', staff())
    expect(await screen.findByRole('heading', { level: 1, name: 'Social media' })).toBeInTheDocument()
    const youtube = await screen.findByRole('heading', { level: 2, name: 'YouTube block' })
    expect(youtube).toBeInTheDocument()
    expect(within(block('YouTube')).getByLabelText(/Heading above the text/)).toHaveValue('YouTube')
    expect(within(block('YouTube')).getByLabelText(/^Text/)).toHaveValue('The YouTube text of the home page.')
    expect(within(block('YouTube')).getByLabelText(/Words of the button/)).toHaveValue('Explore our YouTube channel')
    expect(within(block('YouTube')).getByLabelText(/Address the button leads to/)).toHaveValue('https://www.youtube.com/@edagroup')
    expect(within(block('LinkedIn')).getByLabelText(/Address the button leads to/)).toHaveValue('https://www.linkedin.com/company/edagroup/')
    expect(screen.getAllByText(/of 450 characters/)).toHaveLength(2)
    await expectNoAxeViolations(container)
  })

  it('is reached from the site text page and from the home page of the administrative staff', async () => {
    const { unmount } = renderAdmin('/site', staff())
    expect(await screen.findByRole('link', { name: /Social media/ })).toHaveAttribute('href', '/site/social')
    unmount()
    renderAdmin('/', staff({ 'GET /api/admin/links/problems': { body: { problems: [], last_check: null, threshold: 3 } } }))
    expect(await screen.findByRole('link', { name: /Change the social media text/ })).toHaveAttribute('href', '/site/social')
  })

  it('saves one block whole, tidied, says what else it changes, and leaves the other block alone', async () => {
    const user = userEvent.setup()
    const saved = { slug: 'youtube', label: 'YouTube', text: 'A new text.', cta: 'Watch our videos', url: 'https://www.youtube.com/@new' }
    const { calls } = renderAdmin('/site/social', staff({ 'PUT /api/admin/site/social/youtube': { body: saved } }))
    const youtube = within(await screen.findByRole('heading', { level: 2, name: 'YouTube block' }).then(() => block('YouTube')))
    const text = youtube.getByLabelText(/^Text/)
    await user.clear(text)
    await user.type(text, '  A  new text. ')
    const cta = youtube.getByLabelText(/Words of the button/)
    await user.clear(cta)
    await user.type(cta, 'Watch our videos')
    const url = youtube.getByLabelText(/Address the button leads to/)
    await user.clear(url)
    await user.type(url, ' https://www.youtube.com/@new ')
    await user.click(youtube.getByRole('button', { name: 'Save the YouTube block' }))
    expect(await youtube.findByText(/The YouTube block was saved. The icon in the footer leads to the new address too./)).toBeInTheDocument()
    const put = calls.filter((c) => c.method === 'PUT')
    expect(put).toHaveLength(1)
    expect(put[0].url).toBe('/api/admin/site/social/youtube')
    expect(JSON.parse(put[0].body)).toEqual({ label: 'YouTube', text: 'A new text.', cta: 'Watch our videos', url: 'https://www.youtube.com/@new' })
    expect(within(block('LinkedIn')).getByLabelText(/^Text/)).toHaveValue('The LinkedIn text of the home page.')
  })

  it('says so, without asking the server, when nothing was changed', async () => {
    const user = userEvent.setup()
    const { calls } = renderAdmin('/site/social', staff())
    await screen.findByRole('heading', { level: 2, name: 'LinkedIn block' })
    await user.click(within(block('LinkedIn')).getByRole('button', { name: 'Save the LinkedIn block' }))
    expect(await within(block('LinkedIn')).findByText('Nothing was changed.')).toBeInTheDocument()
    expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(0)
  })

  it.each([
    ['Heading above the text', '', 'Enter the heading.'],
    ['Heading above the text', 'H'.repeat(31), 'The heading must be at most 30 characters long.'],
    ['Text', '', 'Write the text.'],
    ['Text', 'T'.repeat(451), 'The text must be at most 450 characters long. It is 451.'],
    ['Text', 'A <b>bold</b> text', 'The text must be plain text, without < or >.'],
    ['Words of the button', '', 'Enter the words of the button.'],
    ['Words of the button', 'C'.repeat(61), 'The words of the button must be at most 60 characters long.'],
    ['Address the button leads to', '', 'Enter the address.'],
    ['Address the button leads to', 'javascript:alert(1)', 'The address must be a web address starting with http:// or https://.'],
    ['Address the button leads to', 'www.youtube.com/@x', 'The address must be a web address starting with http:// or https://.'],
  ])('refuses %s of "%s" before asking the server', async (field, value, message) => {
    const user = userEvent.setup()
    const { calls } = renderAdmin('/site/social', staff())
    await screen.findByRole('heading', { level: 2, name: 'YouTube block' })
    const input = within(block('YouTube')).getByLabelText(new RegExp(`^${field}`))
    await user.clear(input)
    if (value) {
      await user.click(input)
      await user.paste(value)
    }
    await user.click(within(block('YouTube')).getByRole('button', { name: 'Save the YouTube block' }))
    expect(input).toHaveAccessibleDescription(new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(0)
  })

  it('puts a refusal of the server at its field', async () => {
    const user = userEvent.setup()
    renderAdmin('/site/social', staff({ 'PUT /api/admin/site/social/linkedin': { status: 422, body: { detail: { code: 'invalid_input', field: 'url', message: 'The address must be a web address starting with http:// or https://.' } } } }))
    await screen.findByRole('heading', { level: 2, name: 'LinkedIn block' })
    const url = within(block('LinkedIn')).getByLabelText(/Address the button leads to/)
    await user.clear(url)
    await user.type(url, 'https://example.org/changed')
    await user.click(within(block('LinkedIn')).getByRole('button', { name: 'Save the LinkedIn block' }))
    await waitFor(() => expect(url).toHaveAccessibleDescription(/must be a web address starting with http/))
  })

  it('is closed to those who may not keep the site text', async () => {
    renderAdmin('/site/social', { 'GET /api/auth/me': { body: me({ grants: THEME_OWNER }) } })
    expect(await screen.findByRole('heading', { level: 1, name: 'You do not have access to this page' })).toBeInTheDocument()
  })

  it('says so when a block is not set up on the server', async () => {
    renderAdmin('/site/social', staff({ [`GET ${SOCIAL}`]: { body: [blocks()[0]] } }))
    expect(await screen.findByText('The LinkedIn block is not set up on the server.')).toBeInTheDocument()
  })

  it('shows why the page could not be loaded', async () => {
    renderAdmin('/site/social', staff({ [`GET ${SOCIAL}`]: { status: 500, body: { detail: 'broken' } } }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
