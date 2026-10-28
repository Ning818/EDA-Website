import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import FlashNotice from '../components/FlashNotice'
import JointProjectForm from '../components/JointProjectForm'
import { Button, ConfirmDialog, Loading, LoadError, Notice, PageHeading } from '../components/ui'
import { useLoad } from '../useLoad'

export default function JointProjectPage() {
  const { id } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const [saved, setSaved] = useState(0)
  const { status, data: project, error, reload } = useLoad(() => api.get(`/api/admin/joint-projects/${id}`), [id, saved])
  const [notice, setNotice] = useState(null)
  const [removing, setRemoving] = useState({ open: false, busy: false, error: null })

  if (status === 'loading' && !project) {
    return (
      <div className="page">
        <PageHeading title="Joint project">Joint project</PageHeading>
        <Loading>Loading the joint project…</Loading>
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="page page-narrow">
        <PageHeading title="Joint project not found">{error.status === 404 ? 'Joint project not found' : 'Could not load this joint project'}</PageHeading>
        {error.status === 404 ? (
          <>
            <p>There is no joint project with this number.</p>
            <div>
              <Link to="/collaborations">Back to the collaborations</Link>
            </div>
          </>
        ) : (
          <LoadError error={error} onRetry={reload} />
        )}
      </div>
    )
  }

  async function save(body) {
    const updated = await api.patch(`/api/admin/joint-projects/${id}`, body)
    setNotice(`The changes to ${updated.code} were saved.`)
    setSaved((n) => n + 1)
  }

  async function remove() {
    setRemoving((now) => ({ ...now, busy: true }))
    try {
      await api.delete(`/api/admin/joint-projects/${id}`)
      navigate('/collaborations', { replace: true, state: { notice: `The joint project ${project.code} was removed.` } })
    } catch (failure) {
      setRemoving({ open: false, busy: false, error: failure.message })
    }
  }

  return (
    <div className="page page-narrow">
      <Link to="/collaborations" className="back-link">
        Back to the collaborations
      </Link>
      <PageHeading title={project.code}>{project.code}</PageHeading>
      <FlashNotice key={state?.notice} />
      {notice && <Notice kind="ok">{notice}</Notice>}
      <p className="muted">{project.name}</p>

      <section aria-labelledby="correct-heading" className="card stack-lg">
        <h2 id="correct-heading">Correct this joint project</h2>
        <JointProjectForm key={`${id}-${saved}`} project={project} onSave={save} submitLabel="Save changes" />
      </section>

      <section aria-labelledby="remove-heading" className="card stack">
        <h2 id="remove-heading">Remove {project.code}</h2>
        <p>Use this only for a joint project that should not be on the page. To change anything about it, correct the entry above instead.</p>
        {removing.error && <Notice kind="error">{removing.error}</Notice>}
        <div>
          <Button variant="danger" onClick={() => setRemoving({ open: true, busy: false, error: null })}>
            Remove {project.code}…
          </Button>
        </div>
      </section>

      <ConfirmDialog
        open={removing.open}
        title={`Remove ${project.code}?`}
        confirmLabel="Remove the joint project"
        danger
        busy={removing.busy}
        onConfirm={remove}
        onCancel={() => setRemoving({ open: false, busy: false, error: null })}
      >
        <p>The joint project {project.code} is taken off the Collaborations page.</p>
        <p>
          <strong>This cannot be undone in the admin.</strong> A record of what it was is kept.
        </p>
      </ConfirmDialog>
    </div>
  )
}
