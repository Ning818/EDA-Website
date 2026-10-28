import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { collaborator, expectNoAxeViolations, formOf, jointProject, me, renderAdmin } from './helpers'

const staff = () => ({ 'GET /api/auth/me': { body: me() } })

const collaborators = [
  collaborator(),
  collaborator({ id: 6, kind: 'institute', name: 'Fraunhofer FIT', logo_url: '/media/collaborators/institutes/fraunhofer.png' }),
  collaborator({ id: 7, kind: 'company', name: 'Arup', logo_url: null, url: null }),
]
const lists = { 'GET /api/admin/collaborators': { body: collaborators }, 'GET /api/admin/joint-projects': { body: [jointProject()] } }

describe('the collaborations', () => {
  it('lists the collaborators wall by wall and the joint projects, and has no accessibility violations', async () => {
    const { container } = renderAdmin('/collaborations', { ...staff(), ...lists })
    expect(await screen.findByRole('heading', { level: 1, name: 'Collaborations' })).toBeInTheDocument()
    const universities = await screen.findByRole('heading', { level: 3, name: /Universities/ })
    expect(universities).toHaveTextContent('(1)')
    expect(screen.getByRole('heading', { level: 3, name: /Institutes/ })).toHaveTextContent('(1)')
    expect(screen.getByRole('heading', { level: 3, name: /Companies/ })).toHaveTextContent('(1)')
    expect(screen.getByRole('link', { name: 'Brown University' })).toHaveAttribute('href', '/collaborators/5')
    expect(screen.getByRole('link', { name: /Arup/ })).toHaveTextContent('No logo')
    expect(screen.getByRole('link', { name: /DIMMER/ })).toHaveAttribute('href', '/joint-projects/3')
    expect(screen.getByRole('link', { name: 'Add a collaborator' })).toHaveAttribute('href', '/collaborators/new')
    expect(screen.getByRole('link', { name: 'Add a joint project' })).toHaveAttribute('href', '/joint-projects/new')
    await expectNoAxeViolations(container)
  })

  it('says so when a list cannot be loaded, and still shows the other', async () => {
    renderAdmin('/collaborations', { ...staff(), 'GET /api/admin/collaborators': { status: 503, body: { detail: 'Database unreachable' } }, 'GET /api/admin/joint-projects': { body: [jointProject()] } })
    expect(await screen.findByText('Could not load this page')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /DIMMER/ })).toBeInTheDocument()
  })

  it('is not open to a user without the site grant', async () => {
    renderAdmin('/collaborations', { 'GET /api/auth/me': { body: me({ grants: [{ area: 'projects', theme: null }] }) } })
    expect(await screen.findByRole('heading', { level: 1, name: 'You do not have access to this page' })).toBeInTheDocument()
  })
})

describe('adding a collaborator', () => {
  const added = collaborator({ id: 9, kind: 'company', name: 'Acme Chips', logo_url: null })
  const routes = (extra = {}) => ({ ...staff(), ...lists, ...extra })

  it('asks for the wall, the name and the logo, and has no accessibility violations', async () => {
    const user = userEvent.setup()
    const { container, calls } = renderAdmin('/collaborators/new', routes())
    expect(await screen.findByRole('heading', { level: 1, name: 'Add a collaborator' })).toBeInTheDocument()
    await expectNoAxeViolations(container)
    await user.click(screen.getByRole('button', { name: 'Add collaborator' }))
    expect(screen.getByText('There are 3 problems')).toBeInTheDocument()
    expect(screen.getByLabelText(/Wall/)).toHaveAccessibleDescription(/Choose the wall/)
    expect(screen.getByLabelText(/Name/)).toHaveAccessibleDescription(/Enter the name/)
    expect(screen.getByLabelText(/Choose a logo/)).toHaveAccessibleDescription(/Choose the organisation's logo/) // the logo is required
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0)
  })

  it('refuses a website that is not a web address, and a file that is not a usable image, before asking the server', async () => {
    const user = userEvent.setup({ applyAccept: false })
    const { calls } = renderAdmin('/collaborators/new', routes())
    await user.selectOptions(await screen.findByLabelText(/Wall/), 'Company')
    await user.type(screen.getByLabelText(/Name/), 'Acme Chips')
    await user.type(screen.getByLabelText(/Website/), 'www.acme.example')
    await user.upload(screen.getByLabelText(/Choose a logo/), new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }))
    await user.click(screen.getByRole('button', { name: 'Add collaborator' }))
    expect(screen.getByLabelText(/Website/)).toHaveAccessibleDescription(/must be a web address starting with http/)
    expect(screen.getByLabelText(/Choose a logo/)).toHaveAccessibleDescription(/must be a JPEG, PNG or WebP image/)
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0)
  })

  it('adds the collaborator with its logo, and goes back to the list with a message', async () => {
    const user = userEvent.setup()
    const { calls } = renderAdmin('/collaborators/new', routes({ 'POST /api/admin/collaborators': { status: 201, body: added } }))
    await user.selectOptions(await screen.findByLabelText(/Wall/), 'Company')
    await user.type(screen.getByLabelText(/Name/), '  Acme Chips ')
    await user.type(screen.getByLabelText(/Website/), 'https://www.acme.example/en')
    await user.upload(screen.getByLabelText(/Choose a logo/), new File(['x'], 'logo.png', { type: 'image/png' }))
    expect(screen.getByRole('img', { name: 'The logo you chose, as it will be used' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add collaborator' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'POST')).toHaveLength(1))
    const sent = formOf(calls.find((c) => c.method === 'POST'))
    expect(sent).toMatchObject({ kind: 'company', name: 'Acme Chips', url: 'https://www.acme.example/en' })
    expect(sent.logo).toBeInstanceOf(File)
    expect(await screen.findByRole('heading', { level: 1, name: 'Collaborations' })).toBeInTheDocument()
    expect(screen.getByText('Acme Chips was added at the end of the companies wall.')).toBeInTheDocument()
  })

  it('puts a name that is on the wall already at the name', async () => {
    const user = userEvent.setup()
    renderAdmin('/collaborators/new', routes({ 'POST /api/admin/collaborators': { status: 409, body: { detail: { code: 'name_taken', message: 'There is a collaborator with this name in that wall already.' } } } }))
    await user.selectOptions(await screen.findByLabelText(/Wall/), 'Company')
    await user.type(screen.getByLabelText(/Name/), 'Arup')
    await user.upload(screen.getByLabelText(/Choose a logo/), new File(['x'], 'logo.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Add collaborator' }))
    await waitFor(() => expect(screen.getByLabelText(/Name/)).toHaveAccessibleDescription(/with this name in that wall already/))
  })

  it('puts a refusal of the logo at the logo', async () => {
    const user = userEvent.setup()
    renderAdmin('/collaborators/new', routes({ 'POST /api/admin/collaborators': { status: 422, body: { detail: { code: 'logo_invalid', message: 'That file is not a logo that can be used. Use a JPEG, PNG or WebP image.' } } } }))
    await user.selectOptions(await screen.findByLabelText(/Wall/), 'Company')
    await user.type(screen.getByLabelText(/Name/), 'Acme')
    await user.upload(screen.getByLabelText(/Choose a logo/), new File(['x'], 'logo.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Add collaborator' }))
    await waitFor(() => expect(screen.getByLabelText(/Choose a logo/)).toHaveAccessibleDescription(/not a logo that can be used/))
  })
})

describe('a collaborator', () => {
  const open = (body, extra = {}) => renderAdmin(`/collaborators/${body.id}`, { ...staff(), [`GET /api/admin/collaborators/${body.id}`]: { body }, ...lists, ...extra })

  it('shows the collaborator with its wall and its current logo, and has no accessibility violations', async () => {
    const { container } = open(collaborator())
    expect(await screen.findByRole('heading', { level: 1, name: 'Brown University' })).toBeInTheDocument()
    expect(screen.getByText('On the universities wall.')).toBeInTheDocument()
    expect(await screen.findByRole('img', { name: 'Current logo of Brown University' })).toHaveAttribute('src', '/media/collaborators/universities/brown.png')
    await expectNoAxeViolations(container)
  })

  it('sends only what was changed, and an emptied website in clear', async () => {
    const user = userEvent.setup()
    const { calls } = open(collaborator(), { 'PATCH /api/admin/collaborators/5': { body: collaborator({ name: 'Brown Univ.', url: null }) } })
    const name = await screen.findByLabelText(/Name/)
    await user.clear(name)
    await user.type(name, 'Brown Univ.')
    await user.clear(screen.getByLabelText(/Website/))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('The changes to Brown Univ. were saved.')).toBeInTheDocument()
    const sent = formOf(calls.find((c) => c.method === 'PATCH'))
    expect(sent).toEqual({ name: 'Brown Univ.', clear: 'url' })
  })

  it('replaces the logo with a new one, and has no way to take the logo away', async () => {
    const user = userEvent.setup()
    const { calls } = open(collaborator(), { 'PATCH /api/admin/collaborators/5': { body: collaborator() } })
    const chooser = await screen.findByLabelText('Choose a new logo')
    expect(chooser).not.toBeRequired() // the logo it has will do if no new one is chosen
    expect(screen.queryByLabelText(/Take the logo away/)).not.toBeInTheDocument()
    await user.upload(chooser, new File(['x'], 'new.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(1))
    const sent = formOf(calls.find((c) => c.method === 'PATCH'))
    expect(sent.logo).toBeInstanceOf(File)
    expect(sent).not.toHaveProperty('clear')
  })

  it('lets one that has no logo yet be corrected without choosing one', async () => {
    const user = userEvent.setup()
    const { calls } = open(collaborator({ logo_url: null }), { 'PATCH /api/admin/collaborators/5': { body: collaborator({ name: 'Brown Univ.', logo_url: null }) } })
    const name = await screen.findByLabelText(/Name/)
    await user.clear(name)
    await user.type(name, 'Brown Univ.')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('The changes to Brown Univ. were saved.')).toBeInTheDocument()
    expect(formOf(calls.find((c) => c.method === 'PATCH'))).toEqual({ name: 'Brown Univ.' })
  })

  it('says so when nothing was changed, without asking the server', async () => {
    const user = userEvent.setup()
    const { calls } = open(collaborator())
    await user.click(await screen.findByRole('button', { name: 'Save changes' }))
    expect(screen.getByText('Nothing was changed.')).toBeInTheDocument()
    expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(0)
  })

  it('asks before removing, starting on the safe answer, and removes only when confirmed', async () => {
    const user = userEvent.setup()
    const { calls } = open(collaborator(), { 'DELETE /api/admin/collaborators/5': { status: 204 } })
    await user.click(await screen.findByRole('button', { name: /Remove Brown University…/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Remove Brown University?' })
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    expect(within(dialog).getByText(/taken off the universities wall of the Collaborations page, and its logo file is deleted/)).toBeInTheDocument()
    expect(calls.filter((c) => c.method === 'DELETE')).toHaveLength(0)
    await user.click(within(dialog).getByRole('button', { name: 'Remove the collaborator' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'DELETE')).toHaveLength(1))
    expect(await screen.findByRole('heading', { level: 1, name: 'Collaborations' })).toBeInTheDocument()
    expect(screen.getByText('Brown University was removed.')).toBeInTheDocument()
  })

  it('does nothing when the removal is cancelled', async () => {
    const user = userEvent.setup()
    const { calls } = open(collaborator())
    await user.click(await screen.findByRole('button', { name: /Remove Brown University…/ }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    expect(calls.filter((c) => c.method === 'DELETE')).toHaveLength(0)
  })

  it('says so when there is no such collaborator', async () => {
    renderAdmin('/collaborators/99', { ...staff(), 'GET /api/admin/collaborators/99': { status: 404, body: { detail: { code: 'collaborator_not_found', message: 'Collaborator not found.' } } } })
    expect(await screen.findByRole('heading', { level: 1, name: 'Collaborator not found' })).toBeInTheDocument()
  })
})

describe('a joint project', () => {
  const fill = async (user, over = {}) => {
    const values = { code: 'NEWJP', years: '2024–2027', name: 'A joint project for testing', funding: 'EU Horizon', coordinator: 'Politecnico di Torino', url: 'https://cordis.europa.eu/project/id/1', ...over }
    await user.type(await screen.findByLabelText(/^Code/), values.code)
    await user.type(screen.getByLabelText(/^Years/), values.years)
    await user.type(screen.getByLabelText(/^Name/), values.name)
    await user.type(screen.getByLabelText(/^Funding/), values.funding)
    await user.type(screen.getByLabelText(/^Coordinator/), values.coordinator)
    await user.type(screen.getByLabelText(/^Record on CORDIS/), values.url)
  }

  it('asks for everything it needs when adding, and has no accessibility violations', async () => {
    const user = userEvent.setup()
    const { container, calls } = renderAdmin('/joint-projects/new', staff())
    expect(await screen.findByRole('heading', { level: 1, name: 'Add a joint project' })).toBeInTheDocument()
    await expectNoAxeViolations(container)
    await user.click(screen.getByRole('button', { name: 'Add joint project' }))
    expect(screen.getByText('There are 6 problems')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Record on CORDIS/)).toHaveAccessibleDescription(/Enter the address of the project's record/)
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0)
  })

  it('adds the project with its partners, one to a line, and goes back to the list', async () => {
    const user = userEvent.setup()
    const { calls } = renderAdmin('/joint-projects/new', { ...staff(), ...lists, 'POST /api/admin/joint-projects': { status: 201, body: jointProject({ id: 8, code: 'NEWJP' }) } })
    await fill(user)
    await user.type(screen.getByLabelText(/^Other partners/), 'Arup{Enter}{Enter}  IREN  {Enter}Fraunhofer')
    await user.click(screen.getByRole('button', { name: 'Add joint project' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'POST')).toHaveLength(1))
    expect(JSON.parse(calls.find((c) => c.method === 'POST').body)).toEqual({
      code: 'NEWJP',
      years: '2024–2027',
      name: 'A joint project for testing',
      funding: 'EU Horizon',
      coordinator: 'Politecnico di Torino',
      url: 'https://cordis.europa.eu/project/id/1',
      partners: ['Arup', 'IREN', 'Fraunhofer'], // empty lines and spaces do not count
    })
    expect(await screen.findByText('The joint project NEWJP was added at the end of the list.')).toBeInTheDocument()
  })

  it('refuses a record address that is not a web address before asking the server', async () => {
    const user = userEvent.setup()
    renderAdmin('/joint-projects/new', staff())
    await fill(user, { url: 'javascript:alert(1)' })
    await user.click(screen.getByRole('button', { name: 'Add joint project' }))
    expect(screen.getByLabelText(/^Record on CORDIS/)).toHaveAccessibleDescription(/must be a web address starting with http/)
  })

  it('puts a code that another joint project has at the code', async () => {
    const user = userEvent.setup()
    renderAdmin('/joint-projects/new', { ...staff(), 'POST /api/admin/joint-projects': { status: 409, body: { detail: { code: 'code_taken', message: 'There is a joint project with this code already.' } } } })
    await fill(user, { code: 'DIMMER' })
    await user.click(screen.getByRole('button', { name: 'Add joint project' }))
    await waitFor(() => expect(screen.getByLabelText(/^Code/)).toHaveAccessibleDescription(/with this code already/))
  })

  describe('corrected or removed', () => {
    const open = (extra = {}) => renderAdmin('/joint-projects/3', { ...staff(), 'GET /api/admin/joint-projects/3': { body: jointProject() }, ...lists, ...extra })

    it('shows the project with its partners one to a line, and has no accessibility violations', async () => {
      const { container } = open()
      expect(await screen.findByRole('heading', { level: 1, name: 'DIMMER' })).toBeInTheDocument()
      expect(await screen.findByLabelText(/^Other partners/)).toHaveValue('Arup\nIREN')
      await expectNoAxeViolations(container)
    })

    it('sends only what was changed, and the partners as a list', async () => {
      const user = userEvent.setup()
      const { calls } = open({ 'PATCH /api/admin/joint-projects/3': { body: jointProject({ years: '2013-2017', partners: ['Arup'] }) } })
      const years = await screen.findByLabelText(/^Years/)
      await user.clear(years)
      await user.type(years, '2013-2017')
      const partners = screen.getByLabelText(/^Other partners/)
      await user.clear(partners)
      await user.type(partners, 'Arup')
      await user.click(screen.getByRole('button', { name: 'Save changes' }))
      expect(await screen.findByText('The changes to DIMMER were saved.')).toBeInTheDocument()
      expect(JSON.parse(calls.find((c) => c.method === 'PATCH').body)).toEqual({ years: '2013-2017', partners: ['Arup'] })
    })

    it('says so when nothing was changed, without asking the server', async () => {
      const user = userEvent.setup()
      const { calls } = open()
      await user.click(await screen.findByRole('button', { name: 'Save changes' }))
      expect(screen.getByText('Nothing was changed.')).toBeInTheDocument()
      expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(0)
    })

    it('asks before removing it and removes only when confirmed', async () => {
      const user = userEvent.setup()
      const { calls } = open({ 'DELETE /api/admin/joint-projects/3': { status: 204 } })
      await user.click(await screen.findByRole('button', { name: /Remove DIMMER…/ }))
      const dialog = await screen.findByRole('dialog', { name: 'Remove DIMMER?' })
      expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
      expect(calls.filter((c) => c.method === 'DELETE')).toHaveLength(0)
      await user.click(within(dialog).getByRole('button', { name: 'Remove the joint project' }))
      await waitFor(() => expect(calls.filter((c) => c.method === 'DELETE')).toHaveLength(1))
      expect(await screen.findByText('The joint project DIMMER was removed.')).toBeInTheDocument()
    })

    it('says so when there is no such joint project', async () => {
      renderAdmin('/joint-projects/99', { ...staff(), 'GET /api/admin/joint-projects/99': { status: 404, body: { detail: { code: 'joint_project_not_found', message: 'Joint project not found.' } } } })
      expect(await screen.findByRole('heading', { level: 1, name: 'Joint project not found' })).toBeInTheDocument()
    })
  })
})
