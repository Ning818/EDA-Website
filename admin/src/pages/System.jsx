import { api } from '../api/client'
import { Button, Loading, LoadError, Notice, PageHeading } from '../components/ui'
import { useLoad } from '../useLoad'

const moment = (iso) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso))

/** A size in bytes as a person reads it: 1.4 MB, 820 KB. */
export function size(bytes) {
  if (bytes < 1024) return `${bytes} bytes`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

function Facts({ children }) {
  return (
    <dl className="stack" style={{ margin: 0 }}>
      {children}
    </dl>
  )
}

function Fact({ term, children }) {
  return (
    <div>
      <dt className="meta">{term}</dt>
      <dd style={{ margin: 0 }}>{children}</dd>
    </div>
  )
}

// the kinds of link, as the API names them: what they are, in the words of the people who keep them
const KINDS = {
  people: "People's links",
  site: 'Collaborators and joint projects',
  projects: 'Funded projects',
  theme: 'Highlight cards',
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

/** For the developer: how the system is doing. Nothing here can be changed. */
export default function System() {
  const { status, data, error, reload } = useLoad(() => api.get('/api/admin/system'), [])

  return (
    <div className="page">
      <div className="page-head">
        <PageHeading>System status</PageHeading>
        {status === 'ok' && <Button onClick={reload}>Look again</Button>}
      </div>
      <p className="lead">How the system is doing: the database, the check of the links, the uploaded files, the accounts and the content.</p>
      {status === 'loading' && <Loading>Loading the status…</Loading>}
      {status === 'error' && <LoadError error={error} onRetry={reload} />}
      {status === 'ok' && <Status data={data} />}
    </div>
  )
}

function Status({ data }) {
  const { links, database, media, accounts, content } = data
  return (
    <>
      {!database.ok && <Notice kind="error">The database does not answer. Nothing can be saved until it does.</Notice>}
      {links.stale && (
        <Notice kind="warn">
          {links.last_check
            ? `The check of the links has not run for more than ${plural(links.stale_after_days, 'day', 'days')}.`
            : 'The check of the links has never run.'}{' '}
          It is run by the scheduler of the server (<code>python -m app.manage check-links</code>), which may have stopped.
        </Notice>
      )}

      <section aria-labelledby="links-heading" className="card stack">
        <h2 id="links-heading">Check of the links</h2>
        <Facts>
          <Fact term="Last check">{links.last_check ? moment(links.last_check) : 'Never'}</Fact>
          <Fact term="Links in the content">{links.total}</Fact>
          <Fact term="Working">{links.ok}</Fact>
          <Fact term="Failed the last check">{links.broken}</Fact>
          <Fact term={`Reported to the people who keep them (failed ${links.threshold} checks in a row)`}>{links.reported}</Fact>
          <Fact term="Not checked, because the site refuses programs">{links.blocked}</Fact>
          <Fact term="Not checked yet">{links.unchecked}</Fact>
        </Facts>
        <div className="table-wrap" role="region" aria-label="The links by who keeps them, scrolls sideways on a narrow screen" tabIndex={0}>
          <table>
            <caption>Who keeps the links</caption>
            <thead>
              <tr>
                <th scope="col">Links of</th>
                <th scope="col">Kept by</th>
                <th scope="col">Links</th>
                <th scope="col">Failed the last check</th>
                <th scope="col">Reported</th>
              </tr>
            </thead>
            <tbody>
              {links.by_keeper.map((row) => (
                <tr key={row.area}>
                  <th scope="row">{KINDS[row.area] ?? row.area}</th>
                  <td>{row.keepers.length ? row.keepers.join(', ') : <span className="badge badge-warn">No active account</span>}</td>
                  <td>{row.total}</td>
                  <td>{row.broken}</td>
                  <td>{row.reported}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="database-heading" className="card stack">
        <h2 id="database-heading">Database and files</h2>
        <Facts>
          <Fact term="Database">{database.ok ? 'Answering' : 'Not answering'}</Fact>
          <Fact term="Version of the tables">{database.migration ?? 'Unknown'}</Fact>
          <Fact term="Uploaded files">
            {plural(media.files, 'file', 'files')}, {size(media.bytes)}
          </Fact>
        </Facts>
      </section>

      <section aria-labelledby="accounts-heading" className="card stack">
        <h2 id="accounts-heading">Accounts</h2>
        <Facts>
          <Fact term="Accounts">{accounts.total}</Fact>
          <Fact term="Switched on">{accounts.active}</Fact>
          <Fact term="Still on a temporary password">{accounts.on_temporary_password}</Fact>
        </Facts>
      </section>

      <section aria-labelledby="content-heading" className="card stack">
        <h2 id="content-heading">Content</h2>
        <Facts>
          <Fact term="People">{content.people}</Fact>
          <Fact term="Themes">{content.themes}</Fact>
          <Fact term="Funded projects">{content.projects}</Fact>
          <Fact term="Collaborators">{content.collaborators}</Fact>
          <Fact term="Joint projects">{content.joint_projects}</Fact>
        </Facts>
      </section>

      <p className="meta">Time on the server: {moment(data.server_time)}.</p>
    </>
  )
}
