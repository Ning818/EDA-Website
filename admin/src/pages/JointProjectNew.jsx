import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import JointProjectForm from '../components/JointProjectForm'
import { PageHeading } from '../components/ui'

export default function JointProjectNew() {
  const navigate = useNavigate()

  async function save(body) {
    const project = await api.post('/api/admin/joint-projects', body)
    navigate('/collaborations', { state: { notice: `The joint project ${project.code} was added at the end of the list.` } })
  }

  return (
    <div className="page page-narrow">
      <Link to="/collaborations" className="back-link">
        Back to the collaborations
      </Link>
      <PageHeading>Add a joint project</PageHeading>
      <p className="lead">A project the group took part in with other partners, as its record on CORDIS gives it. It shows on the Collaborations page as soon as you save, at the end of the list.</p>
      <div className="card">
        <JointProjectForm onSave={save} submitLabel="Add joint project" />
      </div>
    </div>
  )
}
