import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import CollaboratorForm from '../components/CollaboratorForm'
import FlashNotice from '../components/FlashNotice'
import { Button, ConfirmDialog, Loading, LoadError, Notice, PageHeading } from '../components/ui'
import { KINDS } from '../labels'
import { useLoad } from '../useLoad'

export default function CollaboratorPage() {
  const { id } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const [saved, setSaved] = useState(0)
  const { status, data: collaborator, error, reload } = useLoad(() => api.get(`/api/admin/collaborators/${id}`), [id, saved])
  const [notice, setNotice] = useState(null)
  const [removing, setRemoving] = useState({ open: false, busy: false, error: null })

  if (status === 'loading' && !collaborator) {
    return (
      <div className="page">
        <PageHeading title="Collaborator">Collaborator</PageHeading>
        <Loading>Loading the collaborator…</Loading>
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="page page-narrow">
        <PageHeading title="Collaborator not found">{error.status === 404 ? 'Collaborator not found' : 'Could not load this collaborator'}</PageHeading>
        {error.status === 404 ? (
          <>
            <p>There is no collaborator with this number.</p>
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

  const wall = KINDS.find((kind) => kind.value === collaborator.kind)

  async function save(data) {
    const updated = await api.patchForm(`/api/admin/collaborators/${id}`, data)
    setNotice(`The changes to ${updated.name} were saved.`)
    setSaved((n) => n + 1)
  }

  async function remove() {
    setRemoving((now) => ({ ...now, busy: true }))
    try {
      await api.delete(`/api/admin/collaborators/${id}`)
      navigate('/collaborations', { replace: true, state: { notice: `${collaborator.name} was removed.` } })
    } catch (failure) {
      setRemoving({ open: false, busy: false, error: failure.message })
    }
  }

  return (
    <div className="page page-narrow">
      <Link to="/collaborations" className="back-link">
        Back to the collaborations
      </Link>
      <PageHeading title={collaborator.name}>{collaborator.name}</PageHeading>
      <FlashNotice key={state?.notice} />
      {notice && <Notice kind="ok">{notice}</Notice>}
      <p className="muted">On the {wall?.wall.toLowerCase()} wall.</p>

      <section aria-labelledby="correct-heading" className="card stack-lg">
        <h2 id="correct-heading">Correct this collaborator</h2>
        <CollaboratorForm key={`${id}-${saved}`} collaborator={collaborator} onSave={save} submitLabel="Save changes" />
      </section>

      <section aria-labelledby="remove-heading" className="card stack">
        <h2 id="remove-heading">Remove {collaborator.name}</h2>
        <p>Use this when the collaboration has ended, or the entry was added by mistake. To change the name, the website or the logo, correct the entry above instead.</p>
        {removing.error && <Notice kind="error">{removing.error}</Notice>}
        <div>
          <Button variant="danger" onClick={() => setRemoving({ open: true, busy: false, error: null })}>
            Remove {collaborator.name}…
          </Button>
        </div>
      </section>

      <ConfirmDialog
        open={removing.open}
        title={`Remove ${collaborator.name}?`}
        confirmLabel="Remove the collaborator"
        danger
        busy={removing.busy}
        onConfirm={remove}
        onCancel={() => setRemoving({ open: false, busy: false, error: null })}
      >
        <p>
          {collaborator.name} is taken off the {wall?.wall.toLowerCase()} wall of the Collaborations page{collaborator.logo_url ? ', and its logo file is deleted' : ''}.
        </p>
        <p>
          <strong>This cannot be undone in the admin.</strong> A record of what the entry was is kept.
        </p>
      </ConfirmDialog>
    </div>
  )
}
