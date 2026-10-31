import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/useAuth'
import FlashNotice from '../components/FlashNotice'
import { Notice, PageHeading } from '../components/ui'
import { useLoad } from '../useLoad'

// What a user can do, by what they are allowed to: a task is offered if the user has any of its grants.
const TASKS = [
  { id: 'accounts', title: 'Manage accounts', text: 'Make an account, change what someone may do, switch an account off or give a new temporary password.', to: '/accounts', areas: ['accounts'] },
  { id: 'add-person', title: 'Add a new person', text: 'Add a new member to the People list, with a photo and links if you have them.', to: '/people/new', areas: ['people_add'] },
  { id: 'people', title: 'Find or update a person', text: "Change a member's title, photo or links, or delete a person who was added by mistake.", to: '/people', areas: ['people_add', 'people_edit', 'people_delete'] },
  { id: 'themes', title: 'Edit the theme pages', text: 'The words, research areas, contacts and highlight cards of each research theme.', to: '/themes', areas: ['theme'] },
  { id: 'projects', title: 'Keep the funded projects', text: 'Add a project, mark one as ended, correct one, and keep the Guided Introduction of each theme.', to: '/projects', areas: ['projects'] },
  { id: 'collaborations', title: 'Update the collaborations', text: 'The collaborators on the logo walls of the Collaborations page, and its joint projects.', to: '/collaborations', areas: ['site'] },
  { id: 'intros', title: 'Change a page introduction', text: 'The paragraph under the title of the People page or of the Collaborations page.', to: '/site/intros', areas: ['site'] },
  { id: 'links', title: 'Check the broken links', text: 'The websites linked from the content you keep that have stopped answering.', to: '/links', areas: ['people_edit', 'site', 'projects', 'theme'] },
  { id: 'footer', title: 'Change the footer numbers', text: 'The phone and fax numbers at the foot of every page.', to: '/site/footer', areas: ['site'] },
]

/** Says how many links need looking at; says nothing when none do, or when the answer cannot be had (the Broken links page tells that). */
function BrokenLinksNotice() {
  const { status, data } = useLoad(() => api.get('/api/admin/links/problems'), [])
  if (status !== 'ok' || data.problems.length === 0) return null
  const count = data.problems.length
  return (
    <Notice kind="warn">
      <p>
        {count} {count === 1 ? 'link in the content you keep has' : 'links in the content you keep have'} stopped working. <Link to="/links">Check the broken links</Link>
      </p>
    </Notice>
  )
}

export default function Home() {
  const { user, can } = useAuth()
  const tasks = TASKS.filter((task) => task.areas.some(can))
  const keepsLinks = ['people_edit', 'site', 'projects', 'theme'].some(can)
  return (
    <div className="page">
      <PageHeading title="Home">What would you like to do?</PageHeading>
      <FlashNotice />
      <p className="lead">Signed in as {user.name}.</p>
      {keepsLinks && <BrokenLinksNotice />}
      {tasks.length > 0 && (
        <ul className="task-list" aria-label="Things you can do">
          {tasks.map((task) => (
            <li key={task.id}>
              <Link to={task.to} className="task-card">
                <span className="task-title">{task.title}</span>
                <span className="task-text">{task.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {tasks.length === 0 && <Notice kind="info">Your account is not allowed to do anything in the admin yet. Ask the administrative staff to give you access.</Notice>}
    </div>
  )
}
