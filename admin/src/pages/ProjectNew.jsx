import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import ProjectForm from '../components/ProjectForm'
import { Lead, LoadError, Loading, PageHeading } from '../components/ui'
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
      <Lead>The project shows on its theme's Funded projects page instantly. You need to check if the Guided Introduction still fits.</Lead>
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
