import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ADMINISTRATIVE, THEME_OWNER, THEMES, everyone, expectNoAxeViolations, formOf, me, renderAdmin, theme } from './helpers'

const owner = () => ({ 'GET /api/auth/me': { body: me({ grants: THEME_OWNER }) } })
const withTheme = (extra = {}, body = theme()) => ({ ...owner(), 'GET /api/admin/themes/bioinformatics': { body }, 'GET /api/people': { body: everyone }, ...extra })

describe('the theme pages', () => {
  it('lists the themes the user may keep, and has no accessibility violations', async () => {
    const { container } = renderAdmin('/themes', { ...owner(), 'GET /api/admin/themes': { body: THEMES } })
    expect(await screen.findByRole('heading', { level: 1, name: 'Theme pages' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /Bioinformatics/ })).toHaveAttribute('href', '/themes/bioinformatics')
    expect(screen.getByRole('link', { name: /Smart City/ })).toHaveAttribute('href', '/themes/smart-city')
    await expectNoAxeViolations(container)
  })

  it('is in the navigation of the theme owner only', async () => {
    renderAdmin('/themes', { ...owner(), 'GET /api/admin/themes': { body: THEMES } })
    await screen.findByRole('heading', { level: 1, name: 'Theme pages' })
    expect(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Themes' })).toBeInTheDocument()
  })

  it('is not open to the administrative staff', async () => {
    renderAdmin('/themes', { 'GET /api/auth/me': { body: me({ grants: ADMINISTRATIVE }) } })
    expect(await screen.findByRole('heading', { level: 1, name: 'You do not have access to this page' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Themes' })).not.toBeInTheDocument()
  })

  it('shows each part of a theme with where to change it, and has no accessibility violations', async () => {
    const { container } = renderAdmin('/themes/bioinformatics', withTheme())
    expect(await screen.findByRole('heading', { level: 1, name: 'Bioinformatics' })).toBeInTheDocument()
    expect(screen.getByText('The introduction of the Research page.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Change the words' })).toHaveAttribute('href', '/themes/bioinformatics/words')
    expect(screen.getByRole('link', { name: /Gene expression and modeling/ })).toHaveAttribute('href', '/themes/bioinformatics/areas/11')
    expect(screen.getByRole('link', { name: /Gene expression and modeling/ })).toHaveTextContent('2 topics, 2 people')
    expect(screen.getByRole('link', { name: 'Change the contacts' })).toHaveAttribute('href', '/themes/bioinformatics/contacts')
    expect(screen.getByRole('link', { name: 'Change the paper card' })).toHaveAttribute('href', '/themes/bioinformatics/highlights/paper')
    expect(screen.getByRole('link', { name: 'Write the project card' })).toHaveAttribute('href', '/themes/bioinformatics/highlights/project') // there is none yet
    await expectNoAxeViolations(container)
  })

  it('says so when a theme is not found or not the user\'s', async () => {
    renderAdmin('/themes/bioinformatics', { ...owner(), 'GET /api/admin/themes/bioinformatics': { status: 403, body: { detail: { code: 'not_allowed', message: 'Your account may not do this.' } } } })
    expect(await screen.findByRole('heading', { level: 1, name: 'You do not have access to this theme' })).toBeInTheDocument()
  })
})

describe('the words of a theme', () => {
  it('shows the words, and has no accessibility violations', async () => {
    const { container } = renderAdmin('/themes/bioinformatics/words', withTheme())
    expect(await screen.findByLabelText(/^Name/)).toHaveValue('Bioinformatics')
    expect(screen.getByLabelText(/Introduction of the Research page/)).toHaveValue('The introduction of the Research page.')
    expect(screen.getByLabelText(/Paragraph on the home page/)).toHaveValue('The home paragraph.')
    await expectNoAxeViolations(container)
  })

  it('sends only what was changed, an emptied optional text as null, and goes back with a message', async () => {
    const user = userEvent.setup()
    const { calls } = renderAdmin('/themes/bioinformatics/words', withTheme({ 'PATCH /api/admin/themes/bioinformatics': { body: theme({ short_name: 'Bio', home_summary: null }) } }))
    const shortName = await screen.findByLabelText(/Short name/)
    await user.type(shortName, 'Bio')
    await user.clear(screen.getByLabelText(/Paragraph on the home page/))
    await user.click(screen.getByRole('button', { name: 'Save the words' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(1))
    expect(JSON.parse(calls.find((c) => c.method === 'PATCH').body)).toEqual({ short_name: 'Bio', home_summary: null })
    expect(await screen.findByText('The words of Bioinformatics were saved.')).toBeInTheDocument()
  })

  it('refuses an empty name or introduction before asking the server', async () => {
    const user = userEvent.setup()
    const { calls } = renderAdmin('/themes/bioinformatics/words', withTheme())
    await user.clear(await screen.findByLabelText(/^Name/))
    await user.clear(screen.getByLabelText(/Introduction of the Research page/))
    await user.click(screen.getByRole('button', { name: 'Save the words' }))
    expect(screen.getByText('There are 2 problems')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Name/)).toHaveAccessibleDescription(/Enter the name/)
    expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(0)
  })

  it('says so when nothing was changed, and puts a refusal of the server at its field', async () => {
    const user = userEvent.setup()
    const { calls } = renderAdmin('/themes/bioinformatics/words', withTheme({ 'PATCH /api/admin/themes/bioinformatics': { status: 422, body: { detail: { code: 'invalid_input', field: 'name', message: 'The name must be plain text, without < or >.' } } } }))
    await user.click(await screen.findByRole('button', { name: 'Save the words' }))
    expect(screen.getByText('Nothing was changed.')).toBeInTheDocument()
    expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(0)
    await user.type(screen.getByLabelText(/^Name/), ' x')
    await user.click(screen.getByRole('button', { name: 'Save the words' }))
    await waitFor(() => expect(screen.getByLabelText(/^Name/)).toHaveAccessibleDescription(/plain text/))
  })
})

describe('the contacts of a theme', () => {
  it('shows who is chosen and has no accessibility violations', async () => {
    const { container } = renderAdmin('/themes/bioinformatics/contacts', withTheme())
    expect(await screen.findByRole('heading', { level: 1, name: 'Change the contacts' })).toBeInTheDocument()
    const chosen = await screen.findByRole('region', { name: /Chosen/ })
    expect(within(chosen).getByText('Enrico Macii', { selector: '.person-name' })).toBeInTheDocument()
    await expectNoAxeViolations(container)
  })

  it('does not offer someone who has left, and adds someone found by searching', async () => {
    const user = userEvent.setup()
    renderAdmin('/themes/bioinformatics/contacts', withTheme())
    const add = await screen.findByRole('region', { name: 'Add people' })
    expect(within(add).queryByText('Old Friend')).not.toBeInTheDocument() // a Former member cannot be a contact
    expect(within(add).queryByText('Enrico Macii')).not.toBeInTheDocument() // already chosen
    await user.type(within(add).getByLabelText('Search the People list by name'), 'jose garcia')
    await user.click(within(add).getByRole('button', { name: 'Add José García' }))
    expect(within(screen.getByRole('region', { name: /Chosen/ })).getByText('José García', { selector: '.person-name' })).toBeInTheDocument()
    expect(screen.getByText('José García was added, as number 2.')).toBeInTheDocument() // said in words as well
  })

  it('saves the chosen people in their order and goes back with a message', async () => {
    const user = userEvent.setup()
    const { calls } = renderAdmin('/themes/bioinformatics/contacts', withTheme({ 'PUT /api/admin/themes/bioinformatics/contacts': { body: theme() } }))
    const add = await screen.findByRole('region', { name: 'Add people' })
    await user.click(within(add).getByRole('button', { name: 'Add Sara Vinco' }))
    await user.click(screen.getByRole('button', { name: 'Move up Sara Vinco' }))
    await user.click(screen.getByRole('button', { name: 'Save the contacts' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(1))
    expect(JSON.parse(calls.find((c) => c.method === 'PUT').body)).toEqual({ people: ['sara-vinco', 'enrico-macii'] })
    expect(await screen.findByText('The contacts of Bioinformatics were saved.')).toBeInTheDocument()
  })

  it('warns that with no contact the Refer to section is not on the page', async () => {
    const user = userEvent.setup()
    renderAdmin('/themes/bioinformatics/contacts', withTheme())
    await user.click(await screen.findByRole('button', { name: 'Take out Enrico Macii' }))
    expect(screen.getByText(/With no contact the "Refer to" section is not on the page/)).toBeInTheDocument()
  })

  it('puts the refusal of the server in a message', async () => {
    const user = userEvent.setup()
    renderAdmin('/themes/bioinformatics/contacts', withTheme({ 'PUT /api/admin/themes/bioinformatics/contacts': { status: 422, body: { detail: { code: 'invalid_input', field: 'people', message: 'Old Friend has left the group and cannot be a contact.' } } } }))
    await user.click(await screen.findByRole('button', { name: 'Take out Enrico Macii' }))
    await user.click(screen.getByRole('button', { name: 'Save the contacts' }))
    expect(await screen.findByText('Old Friend has left the group and cannot be a contact.')).toBeInTheDocument()
  })
})

describe('the research areas of a theme', () => {
  it('lists the areas in their order and moves one down, keeping the focus on the button used', async () => {
    const user = userEvent.setup()
    let moved = false
    const areas = theme().areas
    const { calls } = renderAdmin(
      '/themes/bioinformatics/areas',
      withTheme({ 'POST /api/admin/areas/11/move': () => ((moved = true), { body: areas[0] }) }, theme()),
    )
    renderAdminReload(moved)
    const down = await screen.findByRole('button', { name: 'Move down Gene expression and modeling' })
    expect(screen.getByRole('button', { name: 'Move up Gene expression and modeling' })).toHaveAttribute('aria-disabled', 'true') // the first one
    await user.click(down)
    await waitFor(() => expect(calls.filter((c) => c.method === 'POST')).toHaveLength(1))
    expect(JSON.parse(calls.find((c) => c.method === 'POST').body)).toEqual({ direction: 'down' })
  })

  it('adds an area at the end and goes to its page to add the topics and the people', async () => {
    const user = userEvent.setup()
    const { calls } = renderAdmin(
      '/themes/bioinformatics/areas',
      withTheme({ 'POST /api/admin/themes/bioinformatics/areas': { status: 201, body: { id: 13, title: 'A new area', topics: [], people: [] } } }),
    )
    await user.type(await screen.findByLabelText(/^Title/), 'A new area')
    await user.click(screen.getByRole('button', { name: 'Add research area' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'POST')).toHaveLength(1))
    expect(JSON.parse(calls.find((c) => c.method === 'POST').body)).toEqual({ title: 'A new area' })
    expect(await screen.findByText('Research area not found')).toBeInTheDocument() // the stand-in does not know the new area; the move to its page is what counts
  })

  it('refuses an empty title before asking the server', async () => {
    const user = userEvent.setup()
    const { calls } = renderAdmin('/themes/bioinformatics/areas', withTheme())
    await user.click(await screen.findByRole('button', { name: 'Add research area' }))
    expect(screen.getByLabelText(/^Title/)).toHaveAccessibleDescription(/Enter the title of the research area/)
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0)
  })
})

function renderAdminReload() {}

describe('a research area', () => {
  const open = (extra = {}, body = theme()) => renderAdmin('/themes/bioinformatics/areas/11', withTheme(extra, body))

  it('shows its title, topics and involved people, and has no accessibility violations', async () => {
    const { container } = open()
    expect(await screen.findByRole('heading', { level: 1, name: 'Gene expression and modeling' })).toBeInTheDocument()
    expect(screen.getByText('Regulatory networks', { selector: '.picker-name' })).toBeInTheDocument()
    const chosen = await screen.findByRole('region', { name: /Chosen/ })
    expect(within(chosen).getByText('Sara Vinco', { selector: '.person-name' })).toBeInTheDocument()
    await expectNoAxeViolations(container)
  })

  it('renames the area, saying nothing was changed when it was not', async () => {
    const user = userEvent.setup()
    const { calls } = open({ 'PATCH /api/admin/areas/11': { body: theme().areas[0] } })
    await user.click(await screen.findByRole('button', { name: 'Save the title' }))
    expect(screen.getByText('Nothing was changed.')).toBeInTheDocument()
    const title = screen.getByLabelText('Title (required)')
    await user.clear(title)
    await user.type(title, 'Expression of genes')
    await user.click(screen.getByRole('button', { name: 'Save the title' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(1))
    expect(JSON.parse(calls.find((c) => c.method === 'PATCH').body)).toEqual({ title: 'Expression of genes' })
  })

  it('adds a topic, and refuses an empty one before asking the server', async () => {
    const user = userEvent.setup()
    const { calls } = open({ 'POST /api/admin/areas/11/topics': { status: 201, body: { id: 103, text: 'A new topic' } } })
    await user.click(await screen.findByRole('button', { name: 'Add topic' }))
    expect(screen.getByLabelText('Add a topic')).toHaveAccessibleDescription(/Enter the topic/)
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0)
    await user.type(screen.getByLabelText('Add a topic'), 'A new topic')
    await user.click(screen.getByRole('button', { name: 'Add topic' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'POST')).toHaveLength(1))
    expect(JSON.parse(calls.find((c) => c.method === 'POST').body)).toEqual({ text: 'A new topic' })
    expect(await screen.findByText('The topic was added at the end.')).toBeInTheDocument()
  })

  it('changes a topic in place and moves one', async () => {
    const user = userEvent.setup()
    const { calls } = open({ 'PATCH /api/admin/topics/101': { body: { id: 101, text: 'Networks' } }, 'POST /api/admin/topics/102/move': { body: { id: 102, text: 'Modeling of expression' } } })
    await user.click(await screen.findByRole('button', { name: 'Change Regulatory networks' }))
    const input = screen.getByRole('textbox', { name: /^Topic/ })
    await user.clear(input)
    await user.type(input, 'Networks')
    await user.click(screen.getByRole('button', { name: 'Save the topic' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(1))
    expect(JSON.parse(calls.find((c) => c.method === 'PATCH').body)).toEqual({ text: 'Networks' })
    await user.click(await screen.findByRole('button', { name: 'Move up Modeling of expression' }))
    await waitFor(() => expect(calls.filter((c) => c.url.endsWith('/move'))).toHaveLength(1))
    expect(JSON.parse(calls.find((c) => c.url.endsWith('/move')).body)).toEqual({ direction: 'up' })
  })

  it('asks before a topic is removed', async () => {
    const user = userEvent.setup()
    const { calls } = open({ 'DELETE /api/admin/topics/101': { status: 204 } })
    await user.click(await screen.findByRole('button', { name: 'Remove Regulatory networks' }))
    const dialog = await screen.findByRole('dialog', { name: 'Remove this topic?' })
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    expect(calls.filter((c) => c.method === 'DELETE')).toHaveLength(0)
    await user.click(within(dialog).getByRole('button', { name: 'Remove the topic' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'DELETE')).toHaveLength(1))
  })

  it('saves the involved people in their order', async () => {
    const user = userEvent.setup()
    const { calls } = open({ 'PUT /api/admin/areas/11/people': { body: theme().areas[0] } })
    const add = await screen.findByRole('region', { name: 'Add people' })
    expect(within(add).getByRole('button', { name: 'Add Old Friend' })).toBeInTheDocument() // one who has left may stay among the involved people
    await user.click(within(add).getByRole('button', { name: 'Add José García' }))
    await user.click(screen.getByRole('button', { name: 'Save the involved people' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(1))
    expect(JSON.parse(calls.find((c) => c.method === 'PUT').body)).toEqual({ people: ['enrico-macii', 'sara-vinco', 'jose-garcia'] })
    expect(await screen.findByText('The involved people were saved.')).toBeInTheDocument()
  })

  it('shows what removing the area takes with it, and removes it only when confirmed', async () => {
    const user = userEvent.setup()
    const { calls } = open({
      'GET /api/admin/areas/11/delete-preview': { body: { topics: 2, people: 2 } },
      'DELETE /api/admin/areas/11?confirm=true': { status: 204 },
    })
    await user.click(await screen.findByRole('button', { name: /Remove Gene expression and modeling…/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Remove Gene expression and modeling?' })
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    expect(within(dialog).getByText(/It takes 2 topics and the 2 involved people off the page/)).toBeInTheDocument()
    expect(calls.filter((c) => c.method === 'DELETE')).toHaveLength(0)
    await user.click(within(dialog).getByRole('button', { name: 'Remove the research area' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'DELETE')).toHaveLength(1))
    expect(await screen.findByRole('heading', { level: 1, name: 'Research areas' })).toBeInTheDocument()
    expect(screen.getByText('The research area "Gene expression and modeling" was removed.')).toBeInTheDocument()
  })

  it('says so when the theme has no such area', async () => {
    renderAdmin('/themes/bioinformatics/areas/99', withTheme())
    expect(await screen.findByRole('heading', { level: 1, name: 'Research area not found' })).toBeInTheDocument()
  })
})

describe('a highlight card', () => {
  const open = (kind, extra = {}, body = theme()) => renderAdmin(`/themes/bioinformatics/highlights/${kind}`, withTheme(extra, body))

  it('shows the card of a paper with its authors and its picture, and has no accessibility violations', async () => {
    const { container } = open('paper')
    expect(await screen.findByLabelText(/^Title/)).toHaveValue('A paper on genes')
    expect(screen.getByLabelText(/Authors, in full/)).toHaveValue('Ada Lovelace, Grace Hopper')
    expect(screen.getByLabelText(/Keywords/)).toHaveValue('Genes\nModels')
    expect(screen.getByRole('img', { name: 'Current picture: A plot of gene expression' })).toBeInTheDocument()
    expect(screen.getByLabelText(/What the picture shows/)).toHaveValue('A plot of gene expression')
    await expectNoAxeViolations(container)
  })

  it('has a second line and no authors for a project', async () => {
    open('project')
    expect(await screen.findByLabelText(/Second line of the title/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Authors, in full/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Journal or conference/)).not.toBeInTheDocument()
  })

  it('writes the whole card, keywords as a list, and keeps the picture it has', async () => {
    const user = userEvent.setup()
    const { calls } = open('paper', { 'PUT /api/admin/themes/bioinformatics/highlights/paper': { body: theme().highlight_paper } })
    const title = await screen.findByLabelText(/^Title/)
    await user.clear(title)
    await user.type(title, 'A better paper')
    await user.click(screen.getByRole('button', { name: 'Save the card' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(1))
    const sent = formOf(calls.find((c) => c.method === 'PUT'))
    expect(sent).toMatchObject({ title: 'A better paper', authors_full: 'Ada Lovelace, Grace Hopper', venue: 'Journal of Genes', url: 'https://iris.polito.it/handle/11583/1', tags: ['Genes', 'Models'], image_alt: 'A plot of gene expression' })
    expect(sent).not.toHaveProperty('image')
    expect(sent).not.toHaveProperty('remove_image')
    expect(await screen.findByText('The highlight paper of Bioinformatics was saved.')).toBeInTheDocument()
  })

  it('needs a text alternative for a new picture, and sends the picture with it', async () => {
    const user = userEvent.setup()
    const { calls } = open('paper', { 'PUT /api/admin/themes/bioinformatics/highlights/paper': { body: theme().highlight_paper } })
    await user.upload(await screen.findByLabelText('Choose a new picture'), new File(['x'], 'new.jpg', { type: 'image/jpeg' }))
    const alt = screen.getByLabelText(/What the picture shows/)
    await user.clear(alt)
    await user.click(screen.getByRole('button', { name: 'Save the card' }))
    expect(screen.getByLabelText(/What the picture shows/)).toHaveAccessibleDescription(/Describe the picture for people who cannot see it/)
    expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(0)
    await user.type(alt, 'A new plot')
    await user.click(screen.getByRole('button', { name: 'Save the card' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(1))
    const sent = formOf(calls.find((c) => c.method === 'PUT'))
    expect(sent.image).toBeInstanceOf(File)
    expect(sent.image_alt).toBe('A new plot')
  })

  it('takes the picture away on request, and then asks for no text alternative', async () => {
    const user = userEvent.setup()
    const { calls } = open('paper', { 'PUT /api/admin/themes/bioinformatics/highlights/paper': { body: { ...theme().highlight_paper, image_url: null, image_alt: null } } })
    await user.click(await screen.findByLabelText('Take the picture away'))
    expect(screen.queryByLabelText(/What the picture shows/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save the card' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(1))
    const sent = formOf(calls.find((c) => c.method === 'PUT'))
    expect(sent.remove_image).toBe('true')
    expect(sent).not.toHaveProperty('image_alt')
  })

  it('asks for what a card needs, with its words, before asking the server', async () => {
    const user = userEvent.setup()
    const { calls } = open('project', {}, theme({ highlight_project: null }))
    await user.click(await screen.findByRole('button', { name: 'Save the card' }))
    expect(screen.getByText('There are 4 problems')).toBeInTheDocument()
    expect(screen.getByLabelText(/Second line of the title/)).toHaveAccessibleDescription(/Enter the second line/)
    expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(0)
  })

  it('refuses an address that is not a web address, and a picture that is not an image', async () => {
    const user = userEvent.setup({ applyAccept: false })
    open('paper')
    const url = await screen.findByLabelText(/Address of the card/)
    await user.clear(url)
    await user.type(url, 'javascript:alert(1)')
    await user.upload(screen.getByLabelText('Choose a new picture'), new File(['<svg/>'], 'p.svg', { type: 'image/svg+xml' }))
    await user.click(screen.getByRole('button', { name: 'Save the card' }))
    expect(screen.getByLabelText(/Address of the card/)).toHaveAccessibleDescription(/must be a web address starting with http/)
    expect(screen.getByLabelText('Choose a new picture')).toHaveAccessibleDescription(/must be a JPEG, PNG or WebP image/)
  })

  it('puts a refusal of the picture at the picture', async () => {
    const user = userEvent.setup()
    open('paper', { 'PUT /api/admin/themes/bioinformatics/highlights/paper': { status: 422, body: { detail: { code: 'image_invalid', message: 'That file is not a picture that can be used.' } } } })
    await user.upload(await screen.findByLabelText('Choose a new picture'), new File(['x'], 'p.jpg', { type: 'image/jpeg' }))
    await user.click(screen.getByRole('button', { name: 'Save the card' }))
    await waitFor(() => expect(screen.getByLabelText('Choose a new picture')).toHaveAccessibleDescription(/not a picture that can be used/))
  })

  it('says so for a card that is neither a paper nor a project', async () => {
    renderAdmin('/themes/bioinformatics/highlights/video', withTheme())
    expect(await screen.findByRole('heading', { level: 1, name: 'Highlight card not found' })).toBeInTheDocument()
  })
})
