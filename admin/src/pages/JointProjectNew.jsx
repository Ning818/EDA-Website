import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import JointProjectForm from '../components/JointProjectForm'
import { Lead, PageHeading } from '../components/ui'

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
      <Lead>A project the group took part in with other partners. Enter it as its record on CORDIS. It shows on the page once you save.</Lead>
      <div className="card">
        <JointProjectForm onSave={save} submitLabel="Add joint project" />
      </div>
    </div>
  )
}
