import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import CollaboratorForm from '../components/CollaboratorForm'
import { PageHeading } from '../components/ui'
import { KINDS } from '../labels'

export default function CollaboratorNew() {
  const navigate = useNavigate()

  async function save(data) {
    const collaborator = await api.postForm('/api/admin/collaborators', data)
    const wall = KINDS.find((kind) => kind.value === collaborator.kind)?.wall.toLowerCase()
    navigate('/collaborations', { state: { notice: `${collaborator.name} was added at the end of the ${wall} wall.` } })
  }

  return (
    <div className="page page-narrow">
      <Link to="/collaborations" className="back-link">
        Back to the collaborations
      </Link>
      <PageHeading>Add a collaborator</PageHeading>
      <p className="lead">The collaborator shows on the Collaborations page as soon as you save, at the end of its wall.</p>
      <div className="card">
        <CollaboratorForm onSave={save} submitLabel="Add collaborator" />
      </div>
    </div>
  )
}
