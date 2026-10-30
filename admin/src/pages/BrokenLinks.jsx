import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Button, Loading, LoadError, Notice, PageHeading } from '../components/ui'
import { useLoad } from '../useLoad'

const day = (iso) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(new Date(iso))
const moment = (iso) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso))

/** The page where the content with the link can be changed. */
export function editPage(problem) {
  switch (problem.source_type) {
    case 'person':
      return `/people/${problem.source_key}`
    case 'collaborator':
      return `/collaborators/${problem.source_key}`
    case 'joint_project':
      return `/joint-projects/${problem.source_key}`
    case 'project':
      return `/projects/${problem.source_key}`
    case 'highlight': {
      const [theme, kind] = problem.source_key.split(':')
      return `/themes/${theme}/highlights/${kind}`
    }
    default:
      return '/'
  }
}

function Problem({ problem, onChecked }) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(null)

  async function checkAgain() {
    setBusy(true)
    setFailed(null)
    try {
      onChecked(problem, await api.post(`/api/admin/links/problems/${problem.id}/check`))
    } catch (error) {
      setFailed(error.status === 404 ? 'That link is not in the content any more. Reload the page to see the list as it is now.' : error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="card stack" style={{ margin: 0 }}>
      <h3>{problem.label}</h3>
      <p>
        <span className="meta">Address </span>
        <span style={{ overflowWrap: 'anywhere' }}>{problem.url}</span>
      </p>
      <p>
        <strong>{problem.detail ?? 'It does not answer'}.</strong>{' '}
        <span className="muted">
          It failed {problem.failures} checks in a row, since {day(problem.first_failed_at)}. Last checked {moment(problem.last_checked_at)}.
        </span>
      </p>
      {failed && <Notice kind="error">{failed}</Notice>}
      <div className="row">
        <Link to={editPage(problem)} className="btn btn-primary">
          Change it<span className="visually-hidden">: {problem.label}</span>
        </Link>
        <Button busy={busy} onClick={checkAgain}>
          Check again<span className="visually-hidden">: {problem.label}</span>
        </Button>
      </div>
    </li>
  )
}

/** The links in the content the user keeps that have stopped working, with a way to the place where each is changed and a way to check it again once it is mended. */
export default function BrokenLinks() {
  const { status, data, error, reload } = useLoad(() => api.get('/api/admin/links/problems'), [])
  const [cleared, setCleared] = useState([])
  const [message, setMessage] = useState('')

  function checked(problem, answer) {
    if (answer.reported) {
      setMessage(`${problem.label}: still not working (${answer.detail ?? 'no answer'}).`)
      reload()
      return
    }
    setCleared((now) => [...now, problem.id])
    setMessage(answer.state === 'ok' ? `${problem.label}: the link works now.` : `${problem.label}: the site did not let the check through, so the link is not reported any more.`)
  }

  const shown = data ? data.problems.filter((problem) => !cleared.includes(problem.id)) : []

  return (
    <div className="page">
      <PageHeading>Broken links</PageHeading>
      <p className="lead">The websites that people, collaborators, projects and highlight cards link to, and that have stopped answering.</p>

      <p role="status" className="visually-hidden">
        {message}
      </p>
      {message && (
        <p className="muted" aria-hidden="true">
          {message}
        </p>
      )}

      {status === 'loading' && <Loading>Loading the broken links…</Loading>}
      {status === 'error' && <LoadError error={error} onRetry={reload} />}
      {status === 'ok' && (
        <>
          <p className="muted">
            {data.last_check ? `All links were last checked on ${moment(data.last_check)}.` : 'No check has been run yet, so there is nothing to report.'} A link is reported here only after it has failed {data.threshold} checks in a row, so a
            website that is down for a day does not raise an alarm.
          </p>
          {shown.length === 0 ? (
            <Notice kind="ok">{data.last_check ? 'No link that you keep is broken.' : 'Nothing to show yet.'}</Notice>
          ) : (
            <section aria-labelledby="problems-heading" className="stack">
              <h2 id="problems-heading">
                {shown.length} {shown.length === 1 ? 'link' : 'links'} to look at
              </h2>
              <ul className="plain-list stack">
                {shown.map((problem) => (
                  <Problem key={problem.id} problem={problem} onChecked={checked} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
