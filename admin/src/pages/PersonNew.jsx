import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/useAuth'
import PersonForm from '../components/PersonForm'
import { Lead, LoadError, Loading, PageHeading } from '../components/ui'
import { useLoad } from '../useLoad'

// What the user may do with the entry afterwards. Those who hold the grants may at any time; whoever only adds people may for the day after they added the person.
function afterwards(canEdit, canDelete) {
  if (canEdit && canDelete) return 'You can correct or delete it at any time.'
  if (canEdit) return 'You can correct the entry at any time and delete it for 24 hours.'
  if (canDelete) return 'You can delete the entry at any time and correct it for 24 hours.'
  return 'You can correct or delete what you enter here for 24 hours; after that only the administrative staff can.'
}

export default function PersonNew() {
  const navigate = useNavigate()
  const { can } = useAuth()
  // a user who keeps theme pages adds a person straight into one of their research areas; the API says which they may choose from
  const keepsThemes = can('theme')
  const loaded = useLoad(() => (keepsThemes ? api.get('/api/admin/research-areas') : Promise.resolve([])), [keepsThemes])
  const areas = loaded.data?.length ? loaded.data : null

  async function save(form) {
    const person = await api.postForm('/api/admin/people', form)
    const area = areas?.find((a) => String(a.id) === form.get('topic_group_id'))
    const where = area ? ` and listed under ${area.title} (${area.theme_name})` : ''
    navigate(`/people/${person.slug}`, { state: { notice: `${person.name} was added to the People list${where}, and shows on the People page now.` } })
  }

  return (
    <div className="page page-narrow">
      <Link to="/people" className="back-link">
        Back to the people
      </Link>
      <PageHeading>Add a new person</PageHeading>
      {loaded.status === 'loading' && <Loading>Loading the research areas…</Loading>}
      {loaded.status === 'error' && <LoadError error={loaded.error} onRetry={loaded.reload} />}
      {loaded.status === 'ok' && (
        <>
          <Lead wide stacked>
            {areas
              ? 'The person is one of the "Involved people" of the area you choose. It also shows on the People page as soon as you save. '
              : 'The person shows on the People page as soon as you save. '}
            {afterwards(can('people_edit'), can('people_delete'))}
          </Lead>
          <div className="card">
            <PersonForm onSave={save} submitLabel="Add person" areas={areas} />
          </div>
        </>
      )}
    </div>
  )
}
