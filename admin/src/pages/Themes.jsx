import { Link } from 'react-router-dom'
import { api } from '../api/client'
import FlashNotice from '../components/FlashNotice'
import { Loading, LoadError, PageHeading } from '../components/ui'
import { useLoad } from '../useLoad'

/** The themes the user may keep: one card for each, which opens its page. */
export default function Themes() {
  const { status, data, error, reload } = useLoad(() => api.get('/api/admin/themes'), [])
  return (
    <div className="page">
      <PageHeading>Theme pages</PageHeading>
      <p className="lead">Choose the theme whose page you want to keep: its words, its research areas, its contacts and its highlight cards.</p>
      <FlashNotice />
      {status === 'loading' && <Loading>Loading the themes…</Loading>}
      {status === 'error' && <LoadError error={error} onRetry={reload} />}
      {status === 'ok' && data.length === 0 && <p>Your account keeps no theme.</p>}
      {status === 'ok' && data.length > 0 && (
        <ul className="task-list" aria-label="Themes">
          {data.map((theme) => (
            <li key={theme.slug}>
              <Link to={`/themes/${theme.slug}`} className="task-card">
                <span className="task-title">{theme.name}</span>
                <span className="task-text">Words, research areas, contacts and highlight cards.</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
