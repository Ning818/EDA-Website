import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { Button, Loading, LoadError, PageHeading, SelectField, TextField } from '../components/ui'
import { useLoad } from '../useLoad'

const PAGE = 50
const moment = (iso) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(iso))

function Details({ entry }) {
  if (!entry.before && !entry.after) return <span className="muted">Nothing more</span>
  return (
    <details>
      <summary>
        Show<span className="visually-hidden"> what changed in entry {entry.id}</span>
      </summary>
      {entry.before && (
        <>
          <p className="meta">Before</p>
          <pre className="log-json">{JSON.stringify(entry.before, null, 2)}</pre>
        </>
      )}
      {entry.after && (
        <>
          <p className="meta">After</p>
          <pre className="log-json">{JSON.stringify(entry.after, null, 2)}</pre>
        </>
      )}
    </details>
  )
}

/** The entries for one choice of filters: the first page, then older ones as the reader asks for them. */
function Entries({ filters, onActions }) {
  const first = useLoad(() => {
    const params = new URLSearchParams({ limit: String(PAGE) })
    if (filters.action) params.set('action', filters.action)
    if (filters.user) params.set('user', filters.user)
    return api.get(`/api/admin/audit?${params}`).then((page) => {
      onActions(page.actions)
      return page
    })
  }, [filters.action, filters.user])
  const [older, setOlder] = useState({ entries: [], next: null, started: false, busy: false, failure: null })

  if (first.status === 'loading') return <Loading>Loading the log…</Loading>
  if (first.status === 'error') return <LoadError error={first.error} onRetry={first.reload} />

  const next = older.started ? older.next : first.data.next_before
  const entries = [...first.data.entries, ...older.entries]

  async function showOlder() {
    setOlder((now) => ({ ...now, busy: true, failure: null }))
    const params = new URLSearchParams({ limit: String(PAGE), before: String(next) })
    if (filters.action) params.set('action', filters.action)
    if (filters.user) params.set('user', filters.user)
    try {
      const page = await api.get(`/api/admin/audit?${params}`)
      setOlder((now) => ({ entries: [...now.entries, ...page.entries], next: page.next_before, started: true, busy: false, failure: null }))
    } catch (error) {
      setOlder((now) => ({ ...now, busy: false, failure: error.message }))
    }
  }

  if (entries.length === 0) return <p className="muted">Nothing in the log matches.</p>
  return (
    <>
      <div className="card table-wrap" role="region" aria-label="Activity log, scrolls sideways on a narrow screen" tabIndex={0}>
        <table>
          <caption>
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} shown, the newest first
          </caption>
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Who</th>
              <th scope="col">Action</th>
              <th scope="col">Done to</th>
              <th scope="col">What changed</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{moment(entry.at)}</td>
                <td>{entry.user_email}</td>
                <td>
                  <code>{entry.action}</code>
                </td>
                <td>
                  {entry.entity_type} <span className="muted">{entry.entity_key}</span>
                </td>
                <td>
                  <Details entry={entry} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {older.failure && <p role="alert">Could not load older entries: {older.failure}</p>}
      {next ? (
        <div>
          <Button busy={older.busy} onClick={showOlder}>
            Show older entries
          </Button>
        </div>
      ) : (
        <p className="muted">That is the whole log.</p>
      )}
    </>
  )
}

/** The two filters, as typed: they take effect, and go into the address, when "Show these entries" is pressed. Made new when the address changes, so that going back shows what it says. */
function Filters({ filters, actions, onApply, onClear }) {
  const [draft, setDraft] = useState(filters)
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onApply({ action: draft.action, user: draft.user.trim() })
      }}
      className="card stack"
      aria-label="Filter the log"
    >
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <SelectField id="log-action" label="Kind of action" value={draft.action} onChange={(event) => setDraft((now) => ({ ...now, action: event.target.value }))}>
          <option value="">All actions</option>
          {actions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
          {draft.action && !actions.includes(draft.action) && <option value={draft.action}>{draft.action}</option>}
        </SelectField>
        <TextField id="log-user" label="Who (part of the email)" value={draft.user} onChange={(event) => setDraft((now) => ({ ...now, user: event.target.value }))} autoComplete="off" />
      </div>
      <div className="row">
        <Button type="submit" variant="primary">
          Show these entries
        </Button>
        <Button onClick={onClear}>Clear the filters</Button>
      </div>
    </form>
  )
}

/** For the developer: who changed what, and when, the newest first, which can be narrowed to one kind of action or one user. The filters are in the address (`/audit?action=person.&user=ada`). */
export default function AuditLog() {
  const [params, setParams] = useSearchParams()
  const filters = { action: params.get('action') ?? '', user: params.get('user') ?? '' }
  const [actions, setActions] = useState([])

  const show = (next) => {
    const query = new URLSearchParams()
    if (next.action) query.set('action', next.action)
    if (next.user) query.set('user', next.user)
    setParams(query)
  }

  return (
    <div className="page">
      <PageHeading>Activity log</PageHeading>
      <p className="lead">Who changed what, and when. Every change made in the admin is written here at the moment it is made, and nothing here can be changed.</p>
      <Filters key={`filters|${filters.action}|${filters.user}`} filters={filters} actions={actions} onApply={show} onClear={() => show({ action: '', user: '' })} />
      <Entries key={`entries|${filters.action}|${filters.user}`} filters={filters} onActions={setActions} />
    </div>
  )
}
