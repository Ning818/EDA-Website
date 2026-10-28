import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import FlashNotice from '../components/FlashNotice'
import PeoplePicker from '../components/PeoplePicker'
import { Button, ConfirmDialog, ErrorSummary, Loading, LoadError, Notice, PageHeading, TextField } from '../components/ui'
import { useForm } from '../useForm'
import { useLoad } from '../useLoad'

const MAX_PEOPLE = 24

function TitleForm({ area, onSaved }) {
  const form = useForm({ title: area.title })
  const [nothing, setNothing] = useState(false)
  const validate = (v) => (!v.title.trim() ? { 'title-field': 'Enter the title.' } : v.title.trim().length > 200 ? { 'title-field': 'The title must be at most 200 characters long.' } : {})
  const send = async (v) => {
    if (v.title.trim().replace(/\s+/g, ' ') === area.title) {
      setNothing(true)
      return
    }
    await api.patch(`/api/admin/areas/${area.id}`, { title: v.title.trim() })
    onSaved('The title was saved.')
  }
  const fieldFor = (error) => (error.code === 'invalid_input' && error.field === 'title' ? 'title-field' : null)
  const bound = form.bind('title')
  return (
    <form onSubmit={(event) => form.submit(event, { validate, send, fieldFor })} noValidate className="stack">
      <ErrorSummary errors={form.errors} version={form.version} />
      {form.failure && (
        <Notice kind="error" focusOnShow>
          {form.failure}
        </Notice>
      )}
      {nothing && <Notice kind="info">Nothing was changed.</Notice>}
      <TextField
        id="title-field"
        label="Title"
        required
        autoComplete="off"
        value={bound.value}
        onChange={(event) => {
          setNothing(false)
          bound.onChange(event)
        }}
        error={form.errors['title-field']}
      />
      <div>
        <Button type="submit" variant="primary" busy={form.busy}>
          Save the title
        </Button>
      </div>
    </form>
  )
}

function Topics({ area, onChanged, remember }) {
  const [editing, setEditing] = useState(null) // { id, text }
  const [failure, setFailure] = useState(null)
  const [removing, setRemoving] = useState({ topic: null, busy: false })
  const add = useForm({ text: '' })

  const run = async (action, message, focusId) => {
    setFailure(null)
    try {
      await action()
      if (focusId) remember(focusId)
      onChanged(message)
      return true
    } catch (problem) {
      setFailure(problem.message)
      return false
    }
  }

  const addTopic = (event) =>
    add.submit(event, {
      validate: (v) => (!v.text.trim() ? { 'topic-new': 'Enter the topic.' } : v.text.trim().length > 300 ? { 'topic-new': 'The topic must be at most 300 characters long.' } : {}),
      send: async (v) => {
        await api.post(`/api/admin/areas/${area.id}/topics`, { text: v.text.trim() })
        add.set('text', '')
        onChanged('The topic was added at the end.')
      },
      fieldFor: (error) => (error.code === 'invalid_input' && error.field === 'text' ? 'topic-new' : null),
    })

  return (
    <section aria-labelledby="topics-heading" className="card stack">
      <h2 id="topics-heading">
        Topics <span className="muted">({area.topics.length})</span>
      </h2>
      {failure && <Notice kind="error">{failure}</Notice>}
      {area.topics.length === 0 ? (
        <p className="muted">There are no topics yet.</p>
      ) : (
        <ol className="plain-list people-list">
          {area.topics.map((topic, index) => (
            <li key={topic.id} className="picker-row">
              {editing?.id === topic.id ? (
                <form
                  className="stack"
                  style={{ width: '100%' }}
                  onSubmit={async (event) => {
                    event.preventDefault()
                    if (!editing.text.trim()) return setFailure('Enter the topic.')
                    if (editing.text.trim() === topic.text) return setEditing(null)
                    if (await run(() => api.patch(`/api/admin/topics/${topic.id}`, { text: editing.text.trim() }), 'The topic was saved.', `topic-${topic.id}-edit`)) setEditing(null)
                  }}
                >
                  <TextField id={`topic-${topic.id}-input`} label="Topic" required autoComplete="off" value={editing.text} onChange={(event) => setEditing({ id: topic.id, text: event.target.value })} />
                  <div className="row">
                    <Button type="submit" variant="primary">
                      Save the topic
                    </Button>
                    <Button onClick={() => setEditing(null)}>Cancel</Button>
                  </div>
                </form>
              ) : (
                <>
                  <span className="picker-name">{topic.text}</span>
                  <span className="row">
                    <Button id={`topic-${topic.id}-edit`} onClick={() => setEditing({ id: topic.id, text: topic.text })}>
                      Change{' '}<span className="visually-hidden">{topic.text}</span>
                    </Button>
                    <Button
                      id={`topic-${topic.id}-up`}
                      aria-disabled={index === 0 ? 'true' : undefined}
                      onClick={() => index > 0 && run(() => api.post(`/api/admin/topics/${topic.id}/move`, { direction: 'up' }), 'The topic was moved up.', `topic-${topic.id}-up`)}
                    >
                      Move up{' '}<span className="visually-hidden">{topic.text}</span>
                    </Button>
                    <Button
                      id={`topic-${topic.id}-down`}
                      aria-disabled={index === area.topics.length - 1 ? 'true' : undefined}
                      onClick={() => index < area.topics.length - 1 && run(() => api.post(`/api/admin/topics/${topic.id}/move`, { direction: 'down' }), 'The topic was moved down.', `topic-${topic.id}-down`)}
                    >
                      Move down{' '}<span className="visually-hidden">{topic.text}</span>
                    </Button>
                    <Button onClick={() => setRemoving({ topic, busy: false })}>
                      Remove{' '}<span className="visually-hidden">{topic.text}</span>
                    </Button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ol>
      )}

      <form onSubmit={addTopic} noValidate className="stack">
        <ErrorSummary errors={add.errors} version={add.version} />
        {add.failure && <Notice kind="error">{add.failure}</Notice>}
        <TextField id="topic-new" label="Add a topic" labelClass="field-label-section" autoComplete="off" hint="One line, for example: Low-power design of digital circuits. It goes at the end." {...add.bind('text')} error={add.errors['topic-new']} />
        <div>
          <Button type="submit" busy={add.busy}>
            Add topic
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={Boolean(removing.topic)}
        title="Remove this topic?"
        confirmLabel="Remove the topic"
        danger
        busy={removing.busy}
        onConfirm={async () => {
          setRemoving((now) => ({ ...now, busy: true }))
          const done = await run(() => api.delete(`/api/admin/topics/${removing.topic.id}`), `The topic was removed.`)
          setRemoving({ topic: null, busy: false })
          return done
        }}
        onCancel={() => setRemoving({ topic: null, busy: false })}
      >
        <p>"{removing.topic?.text}" is taken off the page. A record of it is kept.</p>
      </ConfirmDialog>
    </section>
  )
}

function People({ area, people, onChanged }) {
  const [chosen, setChosen] = useState(area.people.map((person) => person.slug))
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState(null)
  const unchanged = JSON.stringify(chosen) === JSON.stringify(area.people.map((person) => person.slug))

  async function save() {
    if (busy) return
    setBusy(true)
    setFailure(null)
    try {
      await api.put(`/api/admin/areas/${area.id}/people`, { people: chosen })
      onChanged('The involved people were saved.')
    } catch (error) {
      setFailure(error.message)
    }
    setBusy(false)
  }

  return (
    <section aria-labelledby="people-heading" className="card stack-lg">
      <h2 id="people-heading">Involved people</h2>
      <p className="muted">The people whose own work lies in this area, chosen from the People list. The page shows them by rank first, and within a rank in this order. Someone who has left may stay, with the title Former member.</p>
      {failure && (
        <Notice kind="error" focusOnShow>
          {failure}
        </Notice>
      )}
      <PeoplePicker people={people} value={chosen} onChange={setChosen} max={MAX_PEOPLE} />
      <div className="row">
        <Button variant="primary" onClick={save} busy={busy}>
          Save the involved people
        </Button>
        {unchanged && <span className="muted">Nothing has been changed yet.</span>}
      </div>
    </section>
  )
}

function RemoveArea({ area, slug }) {
  const navigate = useNavigate()
  const [state, setState] = useState({ open: false, impact: null, busy: false, error: null })

  async function ask() {
    setState({ open: false, impact: null, busy: true, error: null })
    try {
      setState({ open: true, impact: await api.get(`/api/admin/areas/${area.id}/delete-preview`), busy: false, error: null })
    } catch (error) {
      setState({ open: false, impact: null, busy: false, error: error.message })
    }
  }
  async function remove() {
    setState((now) => ({ ...now, busy: true }))
    try {
      await api.delete(`/api/admin/areas/${area.id}?confirm=true`)
      navigate(`/themes/${slug}/areas`, { replace: true, state: { notice: `The research area "${area.title}" was removed.` } })
    } catch (error) {
      setState({ open: false, impact: null, busy: false, error: error.message })
    }
  }

  return (
    <section aria-labelledby="remove-heading" className="card stack">
      <h2 id="remove-heading">Remove this research area</h2>
      <p>Use this when the area is no longer worked on. Its topics and its involved people go with it; the people stay in the People list.</p>
      {state.error && <Notice kind="error">{state.error}</Notice>}
      <div>
        <Button variant="danger" onClick={ask} busy={state.busy && !state.open}>
          Remove {area.title}…
        </Button>
      </div>
      <ConfirmDialog
        open={state.open}
        title={`Remove ${area.title}?`}
        confirmLabel="Remove the research area"
        danger
        busy={state.busy}
        onConfirm={remove}
        onCancel={() => setState({ open: false, impact: null, busy: false, error: null })}
      >
        {state.impact && (
          <p>
            It takes {state.impact.topics} {state.impact.topics === 1 ? 'topic' : 'topics'} and the {state.impact.people} involved {state.impact.people === 1 ? 'person' : 'people'} off the page.
          </p>
        )}
        <p>
          <strong>This cannot be undone in the admin.</strong> A record of what the area held is kept.
        </p>
      </ConfirmDialog>
    </section>
  )
}

/** One research area: its title, its topics, its involved people, and removing it. */
export default function ThemeArea() {
  const { slug, id } = useParams()
  const theme = useLoad(() => api.get(`/api/admin/themes/${slug}`), [slug])
  const people = useLoad(() => api.get('/api/people'), [])
  const [notice, setNotice] = useState(null)
  const focus = useRef(null)

  const area = theme.data?.areas.find((a) => String(a.id) === id)
  useEffect(() => {
    if (focus.current && theme.status === 'ok') {
      document.getElementById(focus.current)?.focus()
      focus.current = null
    }
  }, [theme.data, theme.status])

  const changed = (message) => {
    setNotice(message)
    theme.reload()
  }

  if ((theme.status === 'loading' && !theme.data) || (people.status === 'loading' && !people.data)) {
    return (
      <div className="page">
        <PageHeading title="Research area">Research area</PageHeading>
        <Loading>Loading the research area…</Loading>
      </div>
    )
  }
  const failed = theme.status === 'error' ? theme : people.status === 'error' ? people : null
  if (failed) {
    return (
      <div className="page page-narrow">
        <PageHeading>Could not load this research area</PageHeading>
        <LoadError
          error={failed.error}
          onRetry={() => {
            theme.reload()
            people.reload()
          }}
        />
      </div>
    )
  }
  if (!area) {
    return (
      <div className="page page-narrow">
        <PageHeading>Research area not found</PageHeading>
        <p>This theme has no research area with this number.</p>
        <Link to={`/themes/${slug}/areas`}>Back to the research areas</Link>
      </div>
    )
  }

  return (
    <div className="page page-narrow">
      <Link to={`/themes/${slug}/areas`} className="back-link">
        Back to the research areas
      </Link>
      <PageHeading title={area.title}>{area.title}</PageHeading>
      <p className="muted">A research area of {theme.data.name}.</p>
      <FlashNotice />
      {notice && <Notice kind="ok">{notice}</Notice>}
      <section aria-labelledby="title-heading" className="card stack">
        <h2 id="title-heading">Title</h2>
        <TitleForm key={`${area.id}-${area.title}`} area={area} onSaved={changed} />
      </section>
      <Topics area={area} onChanged={changed} remember={(id) => { focus.current = id }} />
      <People key={area.people.map((person) => person.slug).join(',')} area={area} people={people.data} onChanged={changed} />
      <RemoveArea area={area} slug={slug} />
    </div>
  )
}
