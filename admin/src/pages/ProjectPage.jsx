import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import FlashNotice from '../components/FlashNotice'
import ProjectForm from '../components/ProjectForm'
import { Button, Loading, LoadError, Notice, PageHeading } from '../components/ui'
import { useLoad } from '../useLoad'

// a change of these asks whether the Guided Introduction of the theme still fits; the address alone does not
const WORDS = ['theme', 'status', 'code', 'description']

export default function ProjectPage() {
  const { id } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const [saved, setSaved] = useState(0)
  const project = useLoad(() => api.get(`/api/admin/projects/${id}`), [id, saved])
  const themes = useLoad(() => api.get('/api/themes'), [])
  const [notice, setNotice] = useState(null)
  const [ending, setEnding] = useState({ busy: false, error: null })

  const loading = (project.status === 'loading' && !project.data) || themes.status === 'loading'
  if (loading && project.status !== 'error') {
    return (
      <div className="page">
        <PageHeading title="Project">Project</PageHeading>
        <Loading>Loading the project…</Loading>
      </div>
    )
  }
  if (project.status === 'error') {
    return (
      <div className="page page-narrow">
        <PageHeading title="Project not found">{project.error.status === 404 ? 'Project not found' : 'Could not load this project'}</PageHeading>
        {project.error.status === 404 ? (
          <>
            <p>There is no project with this number.</p>
            <div>
              <Link to="/projects">Back to the funded projects</Link>
            </div>
          </>
        ) : (
          <LoadError error={project.error} onRetry={project.reload} />
        )}
      </div>
    )
  }
  if (themes.status === 'error') {
    return (
      <div className="page page-narrow">
        <PageHeading>Could not load the themes</PageHeading>
        <LoadError error={themes.error} onRetry={themes.reload} />
      </div>
    )
  }

  const current = project.data
  const name = current.code ?? current.description

  async function save(body) {
    const updated = await api.patch(`/api/admin/projects/${id}`, body)
    if (WORDS.some((key) => key in body)) {
      navigate(`/projects/sentence/${updated.theme_slug}`, { state: { notice: `The project ${updated.code ?? updated.description} was changed.`, ask: true } })
      return
    }
    setNotice('language' in body && !('url' in body) ? 'The language was saved.' : 'language' in body ? 'The language and the address were saved.' : 'The address was saved.')
    setSaved((n) => n + 1)
  }

  async function end() {
    setEnding({ busy: true, error: null })
    try {
      await api.patch(`/api/admin/projects/${id}`, { status: 'ended' })
      navigate(`/projects/sentence/${current.theme_slug}`, { state: { notice: `The project ${name} has ended and is now in the ended list.`, ask: true } })
    } catch (error) {
      setEnding({ busy: false, error: error.message })
    }
  }

  return (
    <div className="page page-narrow">
      <Link to="/projects" className="back-link">
        Back to the funded projects
      </Link>
      <PageHeading title={name}>{name}</PageHeading>
      <FlashNotice key={state?.notice} />
      {notice && <Notice kind="ok">{notice}</Notice>}
      <p>
        <span className={`badge ${current.status === 'ongoing' ? 'badge-ongoing' : 'badge-ended'}`}>{current.status === 'ongoing' ? 'Ongoing' : 'Ended'}</span>{' '}
        <span className="muted">in {current.theme_name}</span>
      </p>

      {current.status === 'ongoing' && (
        <section aria-labelledby="end-heading" className="card stack">
          <h2 id="end-heading">When the project is over</h2>
          <p>It moves to the ended list of {current.theme_name}, and the numbers at the top of the page follow. It is never deleted.</p>
          {ending.error && <Notice kind="error">{ending.error}</Notice>}
          <div>
            <Button onClick={end} busy={ending.busy}>
              This project has ended
            </Button>
          </div>
        </section>
      )}

      <section aria-labelledby="correct-heading" className="card stack-lg">
        <h2 id="correct-heading">Correct this project</h2>
        <ProjectForm key={`${id}-${saved}`} project={current} themes={themes.data} onSave={save} submitLabel="Save changes" />
      </section>
    </div>
  )
}
