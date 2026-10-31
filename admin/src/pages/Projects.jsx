import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import FlashNotice from '../components/FlashNotice'
import { LinkButton, Loading, LoadError, PageHeading, TextField } from '../components/ui'
import { byCode } from '../sorting'
import { useLoad } from '../useLoad'
import { useQueryParam } from '../useQueryParam'

// capitals and accents do not matter when looking for a project
const plain = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function ProjectList({ projects }) {
  return (
    <ul className="plain-list people-list">
      {projects.map((project) => (
        <li key={project.id}>
          <Link to={`/projects/${project.id}`}>
            <span className="person-name">{project.code ?? project.description}</span>
            {project.code && <span className="muted">{project.description}</span>}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default function Projects() {
  const projects = useLoad(() => api.get('/api/admin/projects'), [])
  const themes = useLoad(() => api.get('/api/themes'), [])
  const [query, setQuery] = useQueryParam('q') // in the address, so that a reload or a link brings the same search back

  const shown = useMemo(() => {
    const wanted = plain(query.trim())
    return (projects.data ?? []).filter((project) => !wanted || plain(`${project.code ?? ''} ${project.description}`).includes(wanted))
  }, [projects.data, query])

  const loading = projects.status === 'loading' || themes.status === 'loading'
  const failed = projects.status === 'error' ? projects : themes.status === 'error' ? themes : null
  const searching = Boolean(query.trim())

  return (
    <div className="page">
      <div className="page-head">
        <PageHeading>Funded projects</PageHeading>
        <LinkButton to="/projects/new" variant="primary">
          Add a project
        </LinkButton>
      </div>
      <FlashNotice />
      {loading && !failed && <Loading>Loading the projects…</Loading>}
      {failed && (
        <LoadError
          error={failed.error}
          onRetry={() => {
            projects.reload()
            themes.reload()
          }}
        />
      )}
      {!loading && !failed && (
        <>
          <div className="card" style={{ maxWidth: '32rem' }}>
            <TextField id="project-search" label="Search by code or description" type="search" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" />
          </div>
          <p role="status" className="meta">
            {searching ? `${shown.length} of ${projects.data.length} projects match.` : `${projects.data.length} projects.`}
          </p>
          {themes.data.map((theme) => {
            const inTheme = shown.filter((project) => project.theme_slug === theme.slug)
            if (searching && !inTheme.length) return null
            const ongoing = inTheme.filter((project) => project.status === 'ongoing').sort(byCode)
            const ended = inTheme.filter((project) => project.status === 'ended').sort(byCode)
            return (
              <section key={theme.slug} aria-labelledby={`theme-${theme.slug}`} className="card stack">
                <div className="page-head">
                  <h2 id={`theme-${theme.slug}`} className="theme-title">
                    {theme.name}
                  </h2>
                  <Link to={`/projects/sentence/${theme.slug}`}>
                    Check the Guided Introduction in the research page <span className="visually-hidden">of {theme.name}</span>
                  </Link>
                </div>
                <h3 className="status-heading status-ongoing">Ongoing ({ongoing.length})</h3>
                {ongoing.length ? <ProjectList projects={ongoing} /> : <p className="muted">No ongoing projects.</p>}
                <h3 className="status-heading status-ended">Ended ({ended.length})</h3>
                {ended.length ? <ProjectList projects={ended} /> : <p className="muted">No ended projects.</p>}
              </section>
            )
          })}
          {searching && shown.length === 0 && <p>No project matches that.</p>}
        </>
      )}
    </div>
  )
}
