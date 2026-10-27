import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import FlashNotice from '../components/FlashNotice'
import PersonForm from '../components/PersonForm'
import { Button, ConfirmDialog, Loading, LoadError, Notice, PageHeading } from '../components/ui'
import { GROUPS, LINK_FIELDS } from '../labels'
import { useLoad } from '../useLoad'

const when = (iso) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso))
const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()

export default function PersonPage() {
  const { slug } = useParams()
  const { state } = useLocation()
  const [saved, setSaved] = useState(0)
  const { status, data: person, error, reload } = useLoad(() => api.get(`/api/admin/people/${slug}`), [slug, saved])
  const [notice, setNotice] = useState(null)
  const [remove, setRemove] = useState({ open: false, impact: null, busy: false, error: null })
  const navigate = useNavigate()

  if (status === 'loading' && !person) {
    return (
      <div className="page">
        <PageHeading title="Person">Person</PageHeading>
        <Loading>Loading the person…</Loading>
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="page page-narrow">
        <PageHeading title="Person not found">{error.status === 404 ? 'Person not found' : 'Could not load this person'}</PageHeading>
        {error.status === 404 ? (
          <>
            <p>There is no one with this address in the People list.</p>
            <div>
              <Link to="/people">Back to the people</Link>
            </div>
          </>
        ) : (
          <LoadError error={error} onRetry={reload} />
        )}
      </div>
    )
  }

  const group = GROUPS.find((g) => g.value === person.group)?.label
  const links = LINK_FIELDS.filter(({ key }) => person.links[key])

  async function save(form) {
    const updated = await api.patchForm(`/api/admin/people/${slug}`, form)
    const left = updated.title === 'Former member' && person.title !== 'Former member'
    setNotice(left ? `${updated.name} is now a Former member.` : `The changes to ${updated.name} were saved.`)
    setSaved((n) => n + 1)
  }

  async function askToDelete() {
    setRemove({ open: false, impact: null, busy: true, error: null })
    try {
      const impact = await api.get(`/api/admin/people/${slug}/delete-preview`)
      setRemove({ open: true, impact, busy: false, error: null })
    } catch (error) {
      setRemove({ open: false, impact: null, busy: false, error: error.message })
    }
  }

  async function confirmDelete() {
    setRemove((now) => ({ ...now, busy: true }))
    try {
      await api.delete(`/api/admin/people/${slug}?confirm=true`)
      navigate('/people', { replace: true, state: { notice: `${person.name} was deleted.` } })
    } catch (error) {
      setRemove({ open: false, impact: null, busy: false, error: error.message })
    }
  }

  return (
    <div className="page">
      <Link to="/people" className="back-link">
        Back to the people
      </Link>
      <PageHeading title={person.name}>{person.name}</PageHeading>
      <FlashNotice key={state?.notice} />
      {notice && <Notice kind="ok">{notice}</Notice>}

      <section aria-labelledby="summary-heading" className="card">
        <h2 id="summary-heading" className="visually-hidden">
          Details
        </h2>
        <div className="row" style={{ alignItems: 'flex-start', gap: '1.5rem' }}>
          {person.photo_url ? <img className="person-photo" src={person.photo_url} alt={`Photo of ${person.name}`} /> : <div className="person-initials" aria-hidden="true">{initials(person.name)}</div>}
          <dl className="stack" style={{ margin: 0 }}>
            <div>
              <dt className="meta">Title</dt>
              <dd style={{ margin: 0 }}>{person.title}</dd>
            </div>
            <div>
              <dt className="meta">Group on the People page</dt>
              <dd style={{ margin: 0 }}>{group}</dd>
            </div>
            <div>
              <dt className="meta">Pages elsewhere</dt>
              <dd style={{ margin: 0 }}>
                {links.length === 0 ? (
                  <span className="muted">None.</span>
                ) : (
                  <ul className="plain-list">
                    {links.map(({ key, label }) => (
                      <li key={key}>
                        <a href={person.links[key]} target="_blank" rel="noopener noreferrer">
                          {label}{' '}
                          <span className="visually-hidden">(opens in a new tab)</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {!person.can_edit && <Notice kind="info">Only the administrative staff can change this entry.</Notice>}

      {person.can_edit && (
        <>
          {person.editable_until && (
            <Notice kind="info">You added this person, so you can correct or delete this entry until {when(person.editable_until)}. After that only the administrative staff can.</Notice>
          )}
          <section aria-labelledby="correct-heading" className="card stack-lg">
            <h2 id="correct-heading">Correct this entry</h2>
            <PersonForm key={`${slug}-${saved}`} person={person} onSave={save} submitLabel="Save changes" />
          </section>
        </>
      )}

      {person.can_delete && (
        <section aria-labelledby="delete-heading" className="card stack">
          <h2 id="delete-heading">Delete {person.name}</h2>
          <p>
            Use this only for someone who was added by mistake. A member who has left the group should be made a Former member instead (change the title in the form above): they stay in the lists and the topics,
            and nothing is lost.
          </p>
          {remove.error && <Notice kind="error">{remove.error}</Notice>}
          <div>
            <Button variant="danger" onClick={askToDelete} busy={remove.busy && !remove.open}>
              Delete {person.name}…
            </Button>
          </div>
        </section>
      )}

      <ConfirmDialog
        open={remove.open}
        title={`Delete ${person.name}?`}
        confirmLabel="Delete the person"
        danger
        busy={remove.busy}
        onConfirm={confirmDelete}
        onCancel={() => setRemove({ open: false, impact: null, busy: false, error: null })}
      >
        {remove.impact && remove.impact.refer_to.length === 0 && remove.impact.topics.length === 0 && (
          <p>{person.name} is not a contact of any theme and is not listed under any research topic, so only the entry itself is deleted.</p>
        )}
        {remove.impact && remove.impact.refer_to.length > 0 && (
          <>
            <p>{person.name} will be taken out of the contacts ("Refer to") of:</p>
            <ul>
              {remove.impact.refer_to.map((theme) => (
                <li key={theme.theme_slug}>{theme.theme_name}</li>
              ))}
            </ul>
          </>
        )}
        {remove.impact && remove.impact.topics.length > 0 && (
          <>
            <p>{person.name} will be taken out of the "Involved people" of these research topics:</p>
            <ul>
              {remove.impact.topics.map((topic) => (
                <li key={`${topic.theme_slug}-${topic.group_title}`}>
                  {topic.theme_name}: {topic.group_title}
                </li>
              ))}
            </ul>
          </>
        )}
        <p>
          <strong>This cannot be undone in the admin.</strong> The photo is deleted too. A record of the deletion is kept.
        </p>
        <p className="muted">If {person.name} has left the group, cancel and make them a Former member instead.</p>
      </ConfirmDialog>
    </div>
  )
}
