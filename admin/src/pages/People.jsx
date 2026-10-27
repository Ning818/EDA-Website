import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/useAuth'
import FlashNotice from '../components/FlashNotice'
import { LinkButton, Loading, LoadError, PageHeading, TextField } from '../components/ui'
import { GROUPS } from '../labels'
import { useLoad } from '../useLoad'

// capitals and accents do not matter when looking for a name
const plain = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function People() {
  const { can } = useAuth()
  const { status, data, error, reload } = useLoad(() => api.get('/api/people'), [])
  const [query, setQuery] = useState('')

  const shown = useMemo(() => {
    const wanted = plain(query.trim())
    return (data ?? []).filter((person) => !wanted || plain(`${person.name} ${person.card_name}`).includes(wanted))
  }, [data, query])

  return (
    <div className="page">
      <div className="page-head">
        <PageHeading>People</PageHeading>
        {can('people_add') && <LinkButton to="/people/new" variant="primary">Add a new person</LinkButton>}
      </div>
      <FlashNotice />
      {status === 'loading' && <Loading>Loading the people…</Loading>}
      {status === 'error' && <LoadError error={error} onRetry={reload} />}
      {status === 'ok' && (
        <>
          <div className="card" style={{ maxWidth: '32rem' }}>
            <TextField id="people-search" label="Search by name" type="search" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" />
          </div>
          <p role="status" className="meta">
            {query.trim() ? `${shown.length} of ${data.length} people match.` : `${data.length} people.`}
          </p>
          {GROUPS.map((group) => {
            const people = shown.filter((person) => person.group === group.value)
            if (!people.length) return null
            return (
              <section key={group.value} aria-labelledby={`group-${group.value}`} className="stack">
                <h2 id={`group-${group.value}`}>
                  {group.label} <span className="muted">({people.length})</span>
                </h2>
                <ul className="plain-list people-list">
                  {people.map((person) => (
                    <li key={person.slug}>
                      <Link to={`/people/${person.slug}`}>
                        <span className="person-name">{person.name}</span>
                        <span className="muted">{person.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
          {shown.length === 0 && <p>No one matches that name.</p>}
        </>
      )}
    </div>
  )
}
