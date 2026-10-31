import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import PeoplePicker from '../components/PeoplePicker'
import { Button, Lead, LoadError, Loading, Notice, PageHeading } from '../components/ui'
import { useLoad } from '../useLoad'

const MAX = 12
const left = (person) => person.title === 'Former member'

function ContactsForm({ theme, people }) {
  const navigate = useNavigate()
  const [chosen, setChosen] = useState(theme.contacts.map((person) => person.slug))
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState(null)
  const unchanged = JSON.stringify(chosen) === JSON.stringify(theme.contacts.map((person) => person.slug))

  async function save() {
    if (busy) return
    setBusy(true)
    setFailure(null)
    try {
      await api.put(`/api/admin/themes/${theme.slug}/contacts`, { people: chosen })
      navigate(`/themes/${theme.slug}`, { state: { notice: `The contacts of ${theme.name} were saved.` } })
    } catch (error) {
      setBusy(false)
      setFailure(error.message)
    }
  }

  return (
    <div className="card stack-lg">
      {failure && (
        <Notice kind="error" focusOnShow>
          {failure}
        </Notice>
      )}
      {chosen.length === 0 && <Notice kind="warn">With no contact the "Refer to" section is not on the page.</Notice>}
      <PeoplePicker people={people} value={chosen} onChange={setChosen} max={MAX} level={2} exclude={left} why="Someone who has left the group cannot be a contact, so they are not offered." />
      <div className="row">
        <Button variant="primary" onClick={save} busy={busy}>
          Save the contacts
        </Button>
        {unchanged && <span className="muted">Nothing has been changed yet.</span>}
      </div>
    </div>
  )
}

export default function ThemeContacts() {
  const { slug } = useParams()
  const theme = useLoad(() => api.get(`/api/admin/themes/${slug}`), [slug])
  const people = useLoad(() => api.get('/api/people'), [])
  const ready = theme.status === 'ok' && people.status === 'ok'
  const failed = theme.status === 'error' ? theme : people.status === 'error' ? people : null
  return (
    <div className="page page-narrow">
      <Link to={`/themes/${slug}`} className="back-link">
        Back to the theme
      </Link>
      <PageHeading>Change the contacts</PageHeading>
      <Lead>They are shown as the "Refer to" cards, chosen from the People list.</Lead>
      {!ready && !failed && <Loading>Loading…</Loading>}
      {failed && (
        <LoadError
          error={failed.error}
          onRetry={() => {
            theme.reload()
            people.reload()
          }}
        />
      )}
      {ready && <ContactsForm theme={theme.data} people={people.data} />}
    </div>
  )
}
