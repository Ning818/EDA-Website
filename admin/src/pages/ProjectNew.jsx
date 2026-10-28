import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import ProjectForm from '../components/ProjectForm'
import { Loading, LoadError, PageHeading } from '../components/ui'
import { useLoad } from '../useLoad'

export default function ProjectNew() {
  const navigate = useNavigate()
  const themes = useLoad(() => api.get('/api/themes'), [])

  async function save(body) {
    const project = await api.post('/api/admin/projects', body)
    // adding a project is the moment to ask whether the Guided Introduction of the theme still fits
    navigate(`/projects/sentence/${project.theme_slug}`, { state: { notice: `The project ${project.code ?? project.description} was added to ${project.theme_name}.`, ask: true } })
  }

  return (
    <div className="page page-narrow">
      <Link to="/projects" className="back-link">
        Back to the funded projects
      </Link>
      <PageHeading>Add a project</PageHeading>
      <p className="lead">The project shows on the Funded projects page of its theme as soon as you save, and the numbers at the top of the page count it. Afterwards you are asked whether the Guided Introduction of the theme still fits.</p>
      {themes.status === 'loading' && <Loading>Loading the themes…</Loading>}
      {themes.status === 'error' && <LoadError error={themes.error} onRetry={themes.reload} />}
      {themes.status === 'ok' && (
        <div className="card">
          <ProjectForm themes={themes.data} onSave={save} submitLabel="Add project" />
        </div>
      )}
    </div>
  )
}
