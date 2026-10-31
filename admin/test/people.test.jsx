import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ADMINISTRATIVE, THEME_OWNER, expectNoAxeViolations, formOf, me, person, renderAdmin } from './helpers'

const people = [
  person(),
  person({ slug: 'sara-vinco', name: 'Sara Vinco', card_name: 'Sara Vinco', title: 'Assistant Professor' }),
  person({ slug: 'jose-garcia', name: 'José García', card_name: 'José García', title: 'PhD Student', group: 'phd-students' }),
  person({ slug: 'old-friend', name: 'Old Friend', card_name: 'Old Friend', title: 'Former member', group: 'alumni' }),
]

describe('the people list', () => {
  it('lists the people by group, with a link to each, and has no accessibility violations', async () => {
    const { container } = renderAdmin('/people', { 'GET /api/auth/me': { body: me() }, 'GET /api/people': { body: people } })
    expect(await screen.findByRole('heading', { level: 1, name: 'People' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 2, name: /Professors/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /PhD students and research fellows/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Former members/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Sara Vinco/ })).toHaveAttribute('href', '/people/sara-vinco')
    expect(screen.getByRole('status')).toHaveTextContent('4 people.')
    await expectNoAxeViolations(container)
  })

  it('puts the people of one title in alphabetical order, and keeps the titles in the order the API gives them', async () => {
    const mixed = [
      person({ slug: 'massimo', name: 'Massimo Poncino', card_name: 'Massimo Poncino' }),
      person({ slug: 'enrico', name: 'Enrico Macii', card_name: 'Enrico Macii' }),
      person({ slug: 'bruno', name: 'bruno Zed', card_name: 'bruno Zed' }),
      person({ slug: 'alvaro', name: 'Álvaro Rossi', card_name: 'Álvaro Rossi' }),
      person({ slug: 'sara', name: 'Sara Vinco', card_name: 'Sara Vinco', title: 'Associate Professor' }),
      person({ slug: 'santa', name: 'Santa Di Cataldo', card_name: 'Santa Di Cataldo', title: 'Associate Professor' }),
    ]
    renderAdmin('/people', { 'GET /api/auth/me': { body: me() }, 'GET /api/people': { body: mixed } })
    const section = await screen.findByRole('region', { name: /Professors/ })
    expect(within(section).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Álvaro RossiFull Professor',
      'bruno ZedFull Professor',
      'Enrico MaciiFull Professor',
      'Massimo PoncinoFull Professor',
      'Santa Di CataldoAssociate Professor',
      'Sara VincoAssociate Professor',
    ])
  })

  it('finds a name whatever its capitals and accents', async () => {
    const user = userEvent.setup()
    renderAdmin('/people', { 'GET /api/auth/me': { body: me() }, 'GET /api/people': { body: people } })
    await user.type(await screen.findByLabelText('Search by name'), 'jose garcia')
    expect(screen.getByRole('link', { name: /José García/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Sara Vinco/ })).not.toBeInTheDocument()
    expect(screen.getByText('1 of 4 people match.')).toBeInTheDocument()
  })

  it('offers adding a person only to those who may', async () => {
    renderAdmin('/people', { 'GET /api/auth/me': { body: me({ grants: [{ area: 'people_edit', theme: null }] }) }, 'GET /api/people': { body: people } })
    await screen.findByRole('heading', { level: 1, name: 'People' })
    expect(screen.queryByRole('link', { name: 'Add a new person' })).not.toBeInTheDocument()
  })

  it('tells a user without a grant that they have no access, instead of showing the page', async () => {
    renderAdmin('/people', { 'GET /api/auth/me': { body: me({ grants: [{ area: 'projects', theme: null }] }) } })
    expect(await screen.findByRole('heading', { level: 1, name: 'You do not have access to this page' })).toBeInTheDocument()
  })

  it('says so when the list cannot be loaded, and tries again', async () => {
    const user = userEvent.setup()
    let fail = true
    renderAdmin('/people', {
      'GET /api/auth/me': { body: me() },
      'GET /api/people': () => (fail ? { status: 503, body: { detail: 'Database unreachable' } } : { body: people }),
    })
    expect(await screen.findByText('Could not load this page')).toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { level: 2, name: /Professors/ })).toBeInTheDocument()
  })
})

describe('adding a person', () => {
  const AREAS = [
    { id: 11, title: 'Gene expression and modeling', theme_slug: 'bioinformatics', theme_name: 'Bioinformatics' },
    { id: 12, title: 'Genome analysis', theme_slug: 'bioinformatics', theme_name: 'Bioinformatics' },
    { id: 21, title: 'Smart grids', theme_slug: 'smart-city', theme_name: 'Smart City' },
  ]
  const routes = (extra = {}) => ({ 'GET /api/auth/me': { body: me({ grants: THEME_OWNER }) }, 'GET /api/admin/research-areas': { body: AREAS }, ...extra })

  it('asks for what is needed, with its words, and has no accessibility violations', async () => {
    const user = userEvent.setup()
    const { container, calls } = renderAdmin('/people/new', routes())
    expect(await screen.findByRole('heading', { level: 1, name: 'Add a new person' })).toBeInTheDocument()
    await expectNoAxeViolations(container)
    await user.click(screen.getByRole('button', { name: 'Add person' }))
    expect(screen.getByText('There are 3 problems')).toBeInTheDocument()
    expect(screen.getByLabelText(/Full name/)).toHaveAccessibleDescription(/Enter the name/)
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0)
  })

  it('tells the one who only adds people that the entry can be changed for a day, and the administrative staff that it can at any time', async () => {
    const { unmount } = renderAdmin('/people/new', routes())
    expect(await screen.findByText(/for 24 hours; after that only the administrative staff can/)).toBeInTheDocument()
    expect(screen.getByText(/one of the "Involved people" of the area you choose/)).toBeInTheDocument()
    unmount()
    const { calls } = renderAdmin('/people/new', { 'GET /api/auth/me': { body: me() } })
    expect(await screen.findByText(/You can correct or delete it at any time\./)).toBeInTheDocument()
    expect(screen.queryByText(/24 hours/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Research area/)).not.toBeInTheDocument() // the administrative staff keep no theme page, so there is no area to choose
    expect(calls.filter((c) => c.url === '/api/admin/research-areas')).toHaveLength(0)
  })

  it('asks which research area to list the person under, by theme, and adds the person into it', async () => {
    const user = userEvent.setup()
    const added = person({ slug: 'grace-hopper', name: 'Grace Hopper' })
    const { calls } = renderAdmin('/people/new', routes({ 'POST /api/admin/people': { status: 201, body: added }, 'GET /api/admin/people/grace-hopper': { body: added } }))
    const area = await screen.findByLabelText(/Research area/)
    expect(area).toBeRequired()
    expect([...area.querySelectorAll('optgroup')].map((group) => group.label)).toEqual(['Bioinformatics', 'Smart City'])
    expect(area.querySelector('optgroup[label="Bioinformatics"]').querySelectorAll('option')).toHaveLength(2)
    await user.type(screen.getByLabelText(/Full name/), 'Grace Hopper')
    await user.selectOptions(screen.getByLabelText(/Title/), 'PhD Student')
    await user.click(screen.getByRole('button', { name: 'Add person' }))
    expect(screen.getByLabelText(/Research area/)).toHaveAccessibleDescription(/Choose the research area to list the person under/)
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0)
    await user.selectOptions(screen.getByLabelText(/Research area/), 'Smart grids')
    await user.click(screen.getByRole('button', { name: 'Add person' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'POST')).toHaveLength(1))
    expect(formOf(calls.find((c) => c.method === 'POST'))).toMatchObject({ name: 'Grace Hopper', title: 'PhD Student', topic_group_id: '21' })
    expect(await screen.findByText(/was added to the People list and listed under Smart grids \(Smart City\), and shows on the People page now/)).toBeInTheDocument()
  })

  it('puts the refusal of an area at its field', async () => {
    const user = userEvent.setup()
    renderAdmin('/people/new', routes({ 'POST /api/admin/people': { status: 422, body: { detail: { code: 'invalid_input', field: 'topic_group_id', message: 'That research area does not exist.' } } } }))
    await user.type(await screen.findByLabelText(/Full name/), 'Grace Hopper')
    await user.selectOptions(screen.getByLabelText(/Title/), 'PhD Student')
    await user.selectOptions(screen.getByLabelText(/Research area/), 'Smart grids')
    await user.click(screen.getByRole('button', { name: 'Add person' }))
    await waitFor(() => expect(screen.getByLabelText(/Research area/)).toHaveAccessibleDescription(/That research area does not exist/))
  })

  it('adds the person to the People list alone when there is no research area to choose from', async () => {
    const user = userEvent.setup()
    const added = person({ slug: 'grace-hopper', name: 'Grace Hopper' })
    const { calls } = renderAdmin('/people/new', routes({ 'GET /api/admin/research-areas': { body: [] }, 'POST /api/admin/people': { status: 201, body: added }, 'GET /api/admin/people/grace-hopper': { body: added } }))
    await user.type(await screen.findByLabelText(/Full name/), 'Grace Hopper')
    expect(screen.queryByLabelText(/Research area/)).not.toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText(/Title/), 'PhD Student')
    await user.click(screen.getByRole('button', { name: 'Add person' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'POST')).toHaveLength(1))
    expect(formOf(calls.find((c) => c.method === 'POST'))).not.toHaveProperty('topic_group_id')
  })

  it('refuses a link that is not a web address before asking the server', async () => {
    const user = userEvent.setup()
    renderAdmin('/people/new', routes())
    await user.type(await screen.findByLabelText(/Full name/), 'Grace Hopper')
    await user.selectOptions(screen.getByLabelText(/Title/), 'PhD Student')
    await user.selectOptions(screen.getByLabelText(/Research area/), 'Smart grids')
    await user.type(screen.getByLabelText(/Politecnico page link/), 'javascript:alert(1)')
    await user.click(screen.getByRole('button', { name: 'Add person' }))
    expect(screen.getByLabelText(/Politecnico page link/)).toHaveAccessibleDescription(/must be a web address starting with http/)
  })

  it('asks for the confirmation that the person agreed to a photo, and sends it with the photo', async () => {
    const user = userEvent.setup()
    const { calls } = renderAdmin('/people/new', routes({ 'POST /api/admin/people': { status: 201, body: person({ slug: 'grace-hopper', name: 'Grace Hopper' }) }, 'GET /api/admin/people/grace-hopper': { body: person({ slug: 'grace-hopper', name: 'Grace Hopper' }) } }))
    await user.type(await screen.findByLabelText(/Full name/), 'Grace Hopper')
    await user.selectOptions(screen.getByLabelText(/Title/), 'PhD Student')
    await user.selectOptions(screen.getByLabelText(/Research area/), 'Smart grids')
    expect(screen.queryByLabelText(/agreed to this photo/)).not.toBeInTheDocument() // only once a photo is chosen
    await user.upload(screen.getByLabelText(/Choose a photo/), new File(['x'], 'me.jpg', { type: 'image/jpeg' }))
    await user.click(screen.getByRole('button', { name: 'Add person' }))
    expect(screen.getAllByText('Confirm that the person agreed to the photo being used.').length).toBeGreaterThan(0)
    await user.click(screen.getByLabelText(/agreed to this photo/))
    await user.click(screen.getByRole('button', { name: 'Add person' }))
    const sent = formOf(calls.find((c) => c.method === 'POST' && c.url === '/api/admin/people'))
    expect(sent).toMatchObject({ name: 'Grace Hopper', title: 'PhD Student', photo_consent: 'true' })
    expect(sent.photo).toBeInstanceOf(File)
    expect(await screen.findByRole('heading', { level: 1, name: 'Grace Hopper' })).toBeInTheDocument()
    expect(screen.getByText(/was added to the People list/)).toBeInTheDocument()
  })

  it('warns about a name that is in the list and adds the person only when told it is someone else', async () => {
    const user = userEvent.setup()
    let attempts = 0
    const { calls } = renderAdmin(
      '/people/new',
      routes({
        'POST /api/admin/people': () => {
          attempts += 1
          return attempts === 1
            ? { status: 409, body: { detail: { code: 'possible_duplicate', message: 'x', matches: [person()] } } }
            : { status: 201, body: person({ slug: 'enrico-macii-2' }) }
        },
        'GET /api/admin/people/enrico-macii-2': { body: person({ slug: 'enrico-macii-2' }) },
      }),
    )
    await user.type(await screen.findByLabelText(/Full name/), 'Enrico Macii')
    await user.selectOptions(screen.getByLabelText(/Title/), 'PhD Student')
    await user.selectOptions(screen.getByLabelText(/Research area/), 'Smart grids')
    await user.click(screen.getByRole('button', { name: 'Add person' }))
    const warning = await screen.findByText('Someone with this name is in the list already')
    expect(warning.parentElement).toHaveFocus() // the warning takes the focus: it has to be read before going on
    expect(screen.getByRole('link', { name: /Enrico Macii, Full Professor/ })).toHaveAttribute('href', '/people/enrico-macii')
    await user.click(screen.getByRole('button', { name: 'This is a different person: add anyway' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'POST')).toHaveLength(2))
    expect(formOf(calls.filter((c) => c.method === 'POST')[1])).toMatchObject({ name: 'Enrico Macii', confirm_distinct: 'true' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Enrico Macii' })).toBeInTheDocument()
  })

  it('puts a refusal of the server at its field', async () => {
    const user = userEvent.setup()
    renderAdmin('/people/new', routes({ 'POST /api/admin/people': { status: 422, body: { detail: { code: 'invalid_input', field: 'name', message: 'The name must be plain text, without < or >.' } } } }))
    await user.type(await screen.findByLabelText(/Full name/), 'Grace <b>')
    await user.selectOptions(screen.getByLabelText(/Title/), 'PhD Student')
    await user.selectOptions(screen.getByLabelText(/Research area/), 'Smart grids')
    await user.click(screen.getByRole('button', { name: 'Add person' }))
    expect(await screen.findByLabelText(/Full name/)).toHaveAccessibleDescription(/plain text/)
  })
})

describe('a person', () => {
  const open = (body, extra = {}) =>
    renderAdmin('/people/enrico-macii', { 'GET /api/auth/me': { body: me() }, 'GET /api/admin/people/enrico-macii': { body }, ...extra })

  it('shows the details, with links that say they open a new tab, and has no accessibility violations', async () => {
    const { container } = open(person({ photo_url: '/media/people/enrico-macii.png' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Enrico Macii' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Photo of Enrico Macii' })).toHaveAttribute('src', '/media/people/enrico-macii.png')
    expect(screen.getByRole('link', { name: 'Politecnico page (opens in a new tab)' })).toHaveAttribute('target', '_blank')
    await expectNoAxeViolations(container)
  })

  it('shows no form to someone who may not change the entry', async () => {
    open(person({ can_edit: false }))
    expect(await screen.findByText('Only the administrative staff can change this entry.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Correct this entry' })).not.toBeInTheDocument()
  })

  it('tells the one who added a person until when they may correct them', async () => {
    open(person({ can_edit: true, editable_until: '2026-10-28T15:30:00Z' }))
    expect(await screen.findByText(/you can correct or delete this entry until 28 October 2026/)).toBeInTheDocument()
  })

  it('sends only what was changed, and a link that was emptied as something to clear', async () => {
    const user = userEvent.setup()
    const { calls } = open(person(), { 'PATCH /api/admin/people/enrico-macii': { body: person({ name: 'Enrico M. Macii' }) } })
    const name = await screen.findByLabelText(/Full name/)
    await user.clear(name)
    await user.type(name, 'Enrico M. Macii')
    await user.clear(screen.getByLabelText(/Politecnico page link/))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    const sent = formOf(calls.find((c) => c.method === 'PATCH'))
    expect(sent).toEqual({ name: 'Enrico M. Macii', clear: 'polito' })
    expect(await screen.findByText('The changes to Enrico M. Macii were saved.')).toBeInTheDocument()
  })

  it('says so when nothing was changed, without asking the server', async () => {
    const user = userEvent.setup()
    const { calls } = open(person())
    await user.click(await screen.findByRole('button', { name: 'Save changes' }))
    expect(screen.getByText('Nothing was changed.')).toBeInTheDocument()
    expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(0)
  })

  describe('a member who leaves', () => {
    const asked = {
      status: 409,
      body: {
        detail: {
          code: 'leave_needs_confirmation',
          message: 'x',
          affected: [
            { theme_slug: 'bioinformatics', theme_name: 'Bioinformatics', contacts_left: 0 },
            { theme_slug: 'industry-4-0', theme_name: 'Industry 4.0', contacts_left: 3 },
          ],
        },
      },
    }
    const chooseFormerMember = async (user) => {
      await user.selectOptions(await screen.findByLabelText(/Title/), 'Former member')
      await user.click(screen.getByRole('button', { name: 'Save changes' }))
    }

    it('is a change of title, which shows what leaving does before it is done and does it only when confirmed', async () => {
      const user = userEvent.setup()
      let attempts = 0
      const { calls } = open(person(), {
        'PATCH /api/admin/people/enrico-macii': () => {
          attempts += 1
          return attempts === 1 ? asked : { body: person({ title: 'Former member', group: 'alumni' }) }
        },
      })
      expect(screen.queryByRole('button', { name: /leave/ })).not.toBeInTheDocument() // there is no separate way: the title is the way
      await chooseFormerMember(user)
      const dialog = await screen.findByRole('dialog', { name: 'Let Enrico Macii leave?' })
      expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus() // it starts on the safe answer
      expect(within(dialog).getByText(/Bioinformatics: no contact will be left/)).toBeInTheDocument()
      expect(within(dialog).getByText(/Industry 4.0: 3 contacts are left/)).toBeInTheDocument()
      expect(formOf(calls.find((c) => c.method === 'PATCH'))).toEqual({ title: 'Former member' }) // asked without the confirmation: nothing is done yet
      await user.click(within(dialog).getByRole('button', { name: 'Make a Former member' }))
      await waitFor(() => expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(2))
      expect(formOf(calls.filter((c) => c.method === 'PATCH')[1])).toEqual({ title: 'Former member', confirm_leave: 'true' })
      expect(await screen.findByText('Enrico Macii is now a Former member.')).toBeInTheDocument()
    })

    it('sends the other changes made at the same time with the confirmation', async () => {
      const user = userEvent.setup()
      let attempts = 0
      const { calls } = open(person(), {
        'PATCH /api/admin/people/enrico-macii': () => {
          attempts += 1
          return attempts === 1 ? asked : { body: person({ title: 'Former member', group: 'alumni' }) }
        },
      })
      await user.clear(await screen.findByLabelText(/Politecnico page link/))
      await chooseFormerMember(user)
      await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Make a Former member' }))
      await waitFor(() => expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(2))
      expect(formOf(calls.filter((c) => c.method === 'PATCH')[1])).toEqual({ title: 'Former member', clear: 'polito', confirm_leave: 'true' })
    })

    it('does nothing more when it is cancelled, and the form keeps what was chosen', async () => {
      const user = userEvent.setup()
      const { calls } = open(person(), { 'PATCH /api/admin/people/enrico-macii': asked })
      await chooseFormerMember(user)
      await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }))
      expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(1)
      expect(screen.getByLabelText(/Title/)).toHaveValue('Former member')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('is saved without asking when the person is a contact of no theme', async () => {
      const user = userEvent.setup()
      const { calls } = open(person(), { 'PATCH /api/admin/people/enrico-macii': { body: person({ title: 'Former member', group: 'alumni' }) } })
      await chooseFormerMember(user)
      expect(await screen.findByText('Enrico Macii is now a Former member.')).toBeInTheDocument()
      expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(1)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('offers deleting only to someone who may, and says it is for a person added by mistake', async () => {
    open(person({ can_delete: false }))
    await screen.findByRole('heading', { level: 1, name: 'Enrico Macii' })
    expect(screen.queryByRole('button', { name: /Delete Enrico Macii/ })).not.toBeInTheDocument()
  })

  it('offers the one who added a person both correcting and deleting them, for the day they have', async () => {
    open(person({ can_edit: true, can_delete: true, editable_until: '2026-10-28T15:30:00Z' }))
    expect(await screen.findByText(/you can correct or delete this entry until/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Correct this entry' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Delete Enrico Macii…/ })).toBeInTheDocument()
  })

  it('shows what deleting takes with the person and deletes only when confirmed', async () => {
    const user = userEvent.setup()
    const impact = {
      refer_to: [{ theme_slug: 'bioinformatics', theme_name: 'Bioinformatics', contacts_left: 0 }],
      topics: [{ theme_slug: 'bioinformatics', theme_name: 'Bioinformatics', group_title: 'Gene expression and modeling' }],
    }
    const { calls } = open(person({ can_delete: true }), {
      'GET /api/admin/people/enrico-macii/delete-preview': { body: impact },
      'DELETE /api/admin/people/enrico-macii?confirm=true': { status: 204 },
      'GET /api/people': { body: [] },
    })
    expect(await screen.findByText(/Use this only for someone who was added by mistake/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Delete Enrico Macii…/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete Enrico Macii?' })
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus() // it starts on the safe answer
    expect(within(dialog).getByText('Bioinformatics')).toBeInTheDocument()
    expect(within(dialog).getByText('Bioinformatics: Gene expression and modeling')).toBeInTheDocument()
    expect(within(dialog).getByText('This cannot be undone in the admin.')).toBeInTheDocument()
    expect(calls.filter((c) => c.method === 'DELETE')).toHaveLength(0) // nothing is done yet
    await user.click(within(dialog).getByRole('button', { name: 'Delete the person' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'DELETE')).toHaveLength(1))
    expect(await screen.findByRole('heading', { level: 1, name: 'People' })).toBeInTheDocument()
    expect(screen.getByText('Enrico Macii was deleted.')).toBeInTheDocument()
  })

  it('says when deleting takes nothing else with it, and does nothing when cancelled', async () => {
    const user = userEvent.setup()
    const { calls } = open(person({ can_delete: true }), { 'GET /api/admin/people/enrico-macii/delete-preview': { body: { refer_to: [], topics: [] } } })
    await user.click(await screen.findByRole('button', { name: /Delete Enrico Macii…/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete Enrico Macii?' })
    expect(within(dialog).getByText(/not a contact of any theme and is not listed under any research topic/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(calls.filter((c) => c.method === 'DELETE')).toHaveLength(0)
  })

  it('says when there is no such person', async () => {
    renderAdmin('/people/nobody', {
      'GET /api/auth/me': { body: me({ grants: ADMINISTRATIVE }) },
      'GET /api/admin/people/nobody': { status: 404, body: { detail: { code: 'person_not_found', message: 'Person not found.' } } },
    })
    expect(await screen.findByRole('heading', { level: 1, name: 'Person not found' })).toBeInTheDocument()
  })
})
