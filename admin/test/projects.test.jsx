import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PROJECTS_OWNER, THEMES, expectNoAxeViolations, me, project, renderAdmin } from './helpers'

const owner = () => ({ 'GET /api/auth/me': { body: me({ grants: PROJECTS_OWNER }) } })

const projects = [
  project(),
  project({ id: 2, code: 'R2POWER', description: 'PREPARING R2 EXTENSIONS', theme_slug: 'smart-city', theme_name: 'Smart City' }),
  project({ id: 3, code: null, description: 'A PROJECT WITH NO CODE', url: null, status: 'ended' }),
]

// what the public page of a theme says, which the Guided Introduction page reads
const themeDetail = (over = {}) => ({
  slug: 'bioinformatics',
  name: 'Bioinformatics',
  funded_blurb: 'Ongoing projects include GENEX, which works on gene expression.',
  projects: { ongoing: [{ code: 'GENEX', description: 'GENE EXPRESSION AND MODELING', url: null }], ended: [{ code: null, description: 'A PROJECT WITH NO CODE', url: null }] },
  ...over,
})

describe('the funded projects', () => {
  it('lists the projects of each theme, ongoing and ended, and has no accessibility violations', async () => {
    const { container } = renderAdmin('/projects', { ...owner(), 'GET /api/admin/projects': { body: projects }, 'GET /api/themes': { body: THEMES } })
    expect(await screen.findByRole('heading', { level: 1, name: 'Funded projects' })).toBeInTheDocument()
    const section = await screen.findByRole('region', { name: 'Bioinformatics' })
    expect(within(section).getByRole('heading', { level: 3, name: /Ongoing/ })).toHaveTextContent('(1)')
    expect(within(section).getByRole('heading', { level: 3, name: /Ended/ })).toHaveTextContent('(1)')
    expect(within(section).getByRole('link', { name: /GENEX/ })).toHaveAttribute('href', '/projects/1')
    expect(within(section).getByRole('link', { name: 'A PROJECT WITH NO CODE' })).toHaveAttribute('href', '/projects/3') // with no code the description is the name
    expect(within(section).getByRole('link', { name: /Check the Guided Introduction in the research page of Bioinformatics/ })).toHaveAttribute('href', '/projects/sentence/bioinformatics')
    expect(screen.getByRole('link', { name: 'Add a project' })).toHaveAttribute('href', '/projects/new')
    expect(screen.getByRole('status')).toHaveTextContent('3 projects.')
    await expectNoAxeViolations(container)
  })

  it('puts the projects of each part in alphabetical order of their codes, the ones with no code last', async () => {
    const mixed = [
      project({ id: 1, code: 'B2', description: 'SECOND' }),
      project({ id: 2, code: null, description: 'NO CODE ONE' }),
      project({ id: 3, code: 'A10', description: 'TENTH' }),
      project({ id: 4, code: 'a2', description: 'SECOND OF A' }),
      project({ id: 5, code: null, description: 'NO CODE TWO' }),
      project({ id: 6, code: 'A1', description: 'FIRST' }),
      project({ id: 7, code: 'Z9', description: 'ENDED Z', status: 'ended' }),
      project({ id: 8, code: 'C3', description: 'ENDED C', status: 'ended' }),
    ]
    renderAdmin('/projects', { ...owner(), 'GET /api/admin/projects': { body: mixed }, 'GET /api/themes': { body: THEMES } })
    const section = await screen.findByRole('region', { name: 'Bioinformatics' })
    const links = within(section).getAllByRole('link').map((link) => link.textContent)
    const order = links.filter((text) => !text.startsWith('Check the Guided Introduction'))
    expect(order).toEqual([
      'A1FIRST', // digits count as numbers: A1, a2, A10
      'a2SECOND OF A',
      'A10TENTH',
      'B2SECOND',
      'NO CODE ONE', // no code: last, in the order they came
      'NO CODE TWO',
      'C3ENDED C', // the ended part is ordered on its own
      'Z9ENDED Z',
    ])
  })

  it('finds a project by its code or its description, and leaves out the themes with no match', async () => {
    const user = userEvent.setup()
    renderAdmin('/projects', { ...owner(), 'GET /api/admin/projects': { body: projects }, 'GET /api/themes': { body: THEMES } })
    await user.type(await screen.findByLabelText('Search by code or description'), 'r2 ext')
    expect(screen.getByText('1 of 3 projects match.')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Smart City' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Bioinformatics' })).not.toBeInTheDocument()
  })

  it('says so when the projects cannot be loaded', async () => {
    renderAdmin('/projects', { ...owner(), 'GET /api/admin/projects': { status: 503, body: { detail: 'Database unreachable' } }, 'GET /api/themes': { body: THEMES } })
    expect(await screen.findByText('Could not load this page')).toBeInTheDocument()
  })

  it('is not open to the administrative staff, who keep no projects', async () => {
    renderAdmin('/projects', { 'GET /api/auth/me': { body: me() } })
    expect(await screen.findByRole('heading', { level: 1, name: 'You do not have access to this page' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Projects' })).not.toBeInTheDocument() // and the navigation does not offer it
  })
})

describe('adding a project', () => {
  const routes = (extra = {}) => ({ ...owner(), 'GET /api/themes': { body: THEMES }, ...extra })

  it('asks for the theme and the description, with its words, and has no accessibility violations', async () => {
    const user = userEvent.setup()
    const { container, calls } = renderAdmin('/projects/new', routes())
    expect(await screen.findByRole('heading', { level: 1, name: 'Add a project' })).toBeInTheDocument()
    await screen.findByLabelText(/Theme/)
    await expectNoAxeViolations(container)
    await user.click(screen.getByRole('button', { name: 'Add project' }))
    expect(screen.getByText('There are 2 problems')).toBeInTheDocument()
    expect(screen.getByLabelText(/Theme/)).toHaveAccessibleDescription(/Choose the theme/)
    expect(screen.getByLabelText(/Description/)).toHaveAccessibleDescription(/Enter the description/)
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0)
  })

  it('refuses a website that is not a web address before asking the server', async () => {
    const user = userEvent.setup()
    renderAdmin('/projects/new', routes())
    await user.selectOptions(await screen.findByLabelText(/Theme/), 'Smart City')
    await user.type(screen.getByLabelText(/Description/), 'A NEW PROJECT')
    await user.type(screen.getByLabelText(/Project website/), 'javascript:alert(1)')
    await user.click(screen.getByRole('button', { name: 'Add project' }))
    expect(screen.getByLabelText(/Project website/)).toHaveAccessibleDescription(/must be a web address starting with http/)
  })

  it('adds the project and then asks whether the Guided Introduction of the theme still fits', async () => {
    const user = userEvent.setup()
    const added = project({ id: 9, code: 'NEWP', description: 'A NEW PROJECT', theme_slug: 'smart-city', theme_name: 'Smart City' })
    const { calls } = renderAdmin(
      '/projects/new',
      routes({
        'POST /api/admin/projects': { status: 201, body: added },
        'GET /api/themes/smart-city': { body: themeDetail({ slug: 'smart-city', name: 'Smart City' }) },
      }),
    )
    await user.selectOptions(await screen.findByLabelText(/Theme/), 'Smart City')
    await user.type(screen.getByLabelText(/Code/), 'NEWP')
    await user.type(screen.getByLabelText(/Description/), 'A NEW PROJECT')
    await user.click(screen.getByRole('button', { name: 'Add project' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'POST')).toHaveLength(1))
    expect(JSON.parse(calls.find((c) => c.method === 'POST').body)).toEqual({ theme: 'smart-city', status: 'ongoing', description: 'A NEW PROJECT', code: 'NEWP' })
    expect(await screen.findByRole('heading', { level: 1, name: 'The Guided Introduction of Smart City' })).toBeInTheDocument()
    expect(screen.getByText('The project NEWP was added to Smart City.')).toBeInTheDocument()
    expect(screen.getByText(/The projects of this theme have changed/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Does the Guided Introduction still fit?' })).toBeInTheDocument()
  })

  it('puts a refusal of the server at its field', async () => {
    const user = userEvent.setup()
    renderAdmin('/projects/new', routes({ 'POST /api/admin/projects': { status: 422, body: { detail: { code: 'invalid_input', field: 'description', message: 'The description must be plain text, without < or >.' } } } }))
    await user.selectOptions(await screen.findByLabelText(/Theme/), 'Smart City')
    await user.type(screen.getByLabelText(/Description/), 'x')
    await user.click(screen.getByRole('button', { name: 'Add project' }))
    await waitFor(() => expect(screen.getByLabelText(/Description/)).toHaveAccessibleDescription(/plain text/))
  })
})

describe('a project', () => {
  const open = (body, extra = {}) =>
    renderAdmin(`/projects/${body.id}`, { ...owner(), [`GET /api/admin/projects/${body.id}`]: { body }, 'GET /api/themes': { body: THEMES }, ...extra })

  it('shows the project with its theme and status, and has no accessibility violations', async () => {
    const { container } = open(project())
    expect(await screen.findByRole('heading', { level: 1, name: 'GENEX' })).toBeInTheDocument()
    expect(screen.getByText('Ongoing', { selector: '.badge' })).toBeInTheDocument()
    expect(screen.getByText(/in Bioinformatics/)).toBeInTheDocument()
    expect(await screen.findByLabelText(/Description/)).toHaveValue('GENE EXPRESSION AND MODELING')
    await expectNoAxeViolations(container)
  })

  it('marks an ongoing project as ended, and then asks about the Guided Introduction', async () => {
    const user = userEvent.setup()
    const { calls } = open(project(), {
      'PATCH /api/admin/projects/1': { body: project({ status: 'ended' }) },
      'GET /api/themes/bioinformatics': { body: themeDetail() },
    })
    await user.click(await screen.findByRole('button', { name: 'This project has ended' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(1))
    expect(JSON.parse(calls.find((c) => c.method === 'PATCH').body)).toEqual({ status: 'ended' })
    expect(await screen.findByRole('heading', { level: 1, name: 'The Guided Introduction of Bioinformatics' })).toBeInTheDocument()
    expect(screen.getByText('The project GENEX has ended and is now in the ended list.')).toBeInTheDocument()
  })

  it('does not offer to end a project that has ended', async () => {
    open(project({ status: 'ended' }))
    await screen.findByRole('heading', { level: 1, name: 'GENEX' })
    expect(screen.queryByRole('button', { name: 'This project has ended' })).not.toBeInTheDocument()
  })

  it('sends only what was changed, and an emptied code as null', async () => {
    const user = userEvent.setup()
    const { calls } = open(project(), {
      'PATCH /api/admin/projects/1': { body: project({ code: null, description: 'A CORRECTED DESCRIPTION' }) },
      'GET /api/themes/bioinformatics': { body: themeDetail() },
    })
    const description = await screen.findByLabelText(/Description/)
    await user.clear(description)
    await user.type(description, 'A CORRECTED DESCRIPTION')
    await user.clear(screen.getByLabelText(/Code/))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(1))
    expect(JSON.parse(calls.find((c) => c.method === 'PATCH').body)).toEqual({ description: 'A CORRECTED DESCRIPTION', code: null })
    expect(await screen.findByText('The project A CORRECTED DESCRIPTION was changed.')).toBeInTheDocument() // named as the saved project is: with no code, by its description
  })

  it('changes only the address without asking about the Guided Introduction', async () => {
    const user = userEvent.setup()
    const { calls } = open(project(), { 'PATCH /api/admin/projects/1': { body: project({ url: 'https://new.example.eu/' }) } })
    const website = await screen.findByLabelText(/Project website/)
    await user.clear(website)
    await user.type(website, 'https://new.example.eu/')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('The address was saved.')).toBeInTheDocument()
    expect(JSON.parse(calls.find((c) => c.method === 'PATCH').body)).toEqual({ url: 'https://new.example.eu/' })
    expect(screen.getByRole('heading', { level: 1, name: 'GENEX' })).toBeInTheDocument() // still on the project's page
  })

  it('says so when nothing was changed, without asking the server', async () => {
    const user = userEvent.setup()
    const { calls } = open(project())
    await user.click(await screen.findByRole('button', { name: 'Save changes' }))
    expect(screen.getByText('Nothing was changed.')).toBeInTheDocument()
    expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(0)
  })

  it('says so when there is no such project', async () => {
    renderAdmin('/projects/99', { ...owner(), 'GET /api/admin/projects/99': { status: 404, body: { detail: { code: 'project_not_found', message: 'Project not found.' } } }, 'GET /api/themes': { body: THEMES } })
    expect(await screen.findByRole('heading', { level: 1, name: 'Project not found' })).toBeInTheDocument()
  })
})

describe('the Guided Introduction of a theme', () => {
  const open = (extra = {}) => renderAdmin('/projects/sentence/bioinformatics', { ...owner(), 'GET /api/themes/bioinformatics': { body: themeDetail() }, ...extra })

  it('shows the Guided Introduction and the projects it is about, and has no accessibility violations', async () => {
    const { container } = open()
    expect(await screen.findByRole('heading', { level: 1, name: 'The Guided Introduction of Bioinformatics' })).toBeInTheDocument()
    expect(await screen.findByLabelText(/The Guided Introduction in the research page/)).toHaveValue('Ongoing projects include GENEX, which works on gene expression.')
    const list = screen.getByRole('region', { name: /The projects of Bioinformatics now/ })
    expect(list).toHaveTextContent('GENEX: GENE EXPRESSION AND MODELING')
    expect(list).toHaveTextContent('A PROJECT WITH NO CODE')
    await expectNoAxeViolations(container)
  })

  it('writes the Guided Introduction the owner typed, and goes back to the projects', async () => {
    const user = userEvent.setup()
    const { calls } = open({
      'PUT /api/admin/themes/bioinformatics/funded-blurb': { body: { theme_slug: 'bioinformatics', theme_name: 'Bioinformatics', text: 'A new sentence.' } },
      'GET /api/admin/projects': { body: projects },
      'GET /api/themes': { body: THEMES },
    })
    const text = await screen.findByLabelText(/The Guided Introduction in the research page/)
    await user.clear(text)
    await user.type(text, '  A new sentence.  ')
    await user.click(screen.getByRole('button', { name: 'Save the Guided Introduction' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(1))
    expect(JSON.parse(calls.find((c) => c.method === 'PUT').body)).toEqual({ text: 'A new sentence.' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Funded projects' })).toBeInTheDocument()
    expect(screen.getByText('The Guided Introduction of Bioinformatics was saved.')).toBeInTheDocument()
  })

  it('leaves the Guided Introduction as it is when the owner says it still fits, without asking the server to change anything', async () => {
    const user = userEvent.setup()
    const { calls } = open({ 'GET /api/admin/projects': { body: projects }, 'GET /api/themes': { body: THEMES } })
    await user.click(await screen.findByRole('link', { name: 'It still fits: leave it as it is' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Funded projects' })).toBeInTheDocument()
    expect(screen.getByText('The Guided Introduction of Bioinformatics was left as it is.')).toBeInTheDocument()
    expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(0)
  })

  it('refuses an empty Guided Introduction before asking the server', async () => {
    const user = userEvent.setup()
    const { calls } = open()
    await user.clear(await screen.findByLabelText(/The Guided Introduction in the research page/))
    await user.click(screen.getByRole('button', { name: 'Save the Guided Introduction' }))
    expect(screen.getByLabelText(/The Guided Introduction in the research page/)).toHaveAccessibleDescription(/Write the Guided Introduction/)
    expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(0)
  })

  it('puts a refusal of the server at the field', async () => {
    const user = userEvent.setup()
    open({ 'PUT /api/admin/themes/bioinformatics/funded-blurb': { status: 422, body: { detail: { code: 'invalid_input', field: 'text', message: 'The text must be plain text, without < or >.' } } } })
    const text = await screen.findByLabelText(/The Guided Introduction in the research page/)
    await user.type(text, ' x')
    await user.click(screen.getByRole('button', { name: 'Save the Guided Introduction' }))
    await waitFor(() => expect(screen.getByLabelText(/The Guided Introduction in the research page/)).toHaveAccessibleDescription(/plain text/))
  })
})
