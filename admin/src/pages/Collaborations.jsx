import { Link } from 'react-router-dom'
import { api } from '../api/client'
import FlashNotice from '../components/FlashNotice'
import { Lead, LinkButton, LoadError, Loading, PageHeading } from '../components/ui'
import { KINDS } from '../labels'
import { useLoad } from '../useLoad'

function Collaborators() {
  const { status, data, error, reload } = useLoad(() => api.get('/api/admin/collaborators'), [])
  return (
    <section aria-labelledby="collaborators-heading" className="card stack">
      <div className="page-head">
        <h2 id="collaborators-heading">Collaborators</h2>
        <LinkButton to="/collaborators/new" variant="primary">
          Add a collaborator
        </LinkButton>
      </div>
      {status === 'loading' && <Loading>Loading the collaborators…</Loading>}
      {status === 'error' && <LoadError error={error} onRetry={reload} />}
      {status === 'ok' &&
        KINDS.map((kind) => {
          const wall = data.filter((collaborator) => collaborator.kind === kind.value)
          return (
            <div key={kind.value}>
              <h3>
                {kind.wall} <span className="muted">({wall.length})</span>
              </h3>
              {wall.length ? (
                <ul className="plain-list people-list">
                  {wall.map((collaborator) => (
                    <li key={collaborator.id}>
                      <Link to={`/collaborators/${collaborator.id}`}>
                        <span className="row" style={{ flexWrap: 'nowrap' }}>
                          {collaborator.logo_url ? <img className="logo-thumb" src={collaborator.logo_url} alt="" /> : <span className="logo-thumb" aria-hidden="true" />}
                          <span className="person-name">{collaborator.name}</span>
                        </span>
                        {!collaborator.logo_url && <span className="muted">No logo</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">None.</p>
              )}
            </div>
          )
        })}
    </section>
  )
}

function JointProjects() {
  const { status, data, error, reload } = useLoad(() => api.get('/api/admin/joint-projects'), [])
  return (
    <section aria-labelledby="joint-heading" className="card stack">
      <div className="page-head">
        <h2 id="joint-heading">Joint projects</h2>
        <LinkButton to="/joint-projects/new" variant="primary">
          Add a joint project
        </LinkButton>
      </div>
      {status === 'loading' && <Loading>Loading the joint projects…</Loading>}
      {status === 'error' && <LoadError error={error} onRetry={reload} />}
      {status === 'ok' &&
        (data.length ? (
          <ul className="plain-list people-list">
            {data.map((project) => (
              <li key={project.id}>
                <Link to={`/joint-projects/${project.id}`}>
                  <span className="person-name">{project.code}</span>
                  <span className="muted">
                    {project.name}, {project.years}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">There are no joint projects.</p>
        ))}
    </section>
  )
}

/** What the Collaborations page shows that the administrative staff keep: the three logo walls and the joint projects. */
export default function Collaborations() {
  return (
    <div className="page">
      <PageHeading>Collaborations</PageHeading>
      <Lead>The collaborators on the logo walls of the Collaborations page. Below them are its joint projects.</Lead>
      <FlashNotice />
      <Collaborators />
      <JointProjects />
    </div>
  )
}
