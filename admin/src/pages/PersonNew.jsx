import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import PersonForm from '../components/PersonForm'
import { PageHeading } from '../components/ui'

export default function PersonNew() {
  const navigate = useNavigate()

  async function save(form) {
    const person = await api.postForm('/api/admin/people', form)
    navigate(`/people/${person.slug}`, { state: { notice: `${person.name} was added to the People list and shows on the People page now.` } })
  }

  return (
    <div className="page page-narrow">
      <Link to="/people" className="back-link">
        Back to the people
      </Link>
      <PageHeading>Add a new person</PageHeading>
      <p className="lead">The person shows on the People page as soon as you save. You can correct or delete what you enter here for 24 hours; after that only the administrative staff can.</p>
      <div className="card">
        <PersonForm onSave={save} submitLabel="Add person" />
      </div>
    </div>
  )
}
