import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import FlashNotice from '../components/FlashNotice'
import { Notice, PageHeading } from '../components/ui'

// What a user can do, by what they are allowed to: a task is offered if the user has any of its grants.
const TASKS = [
  { id: 'add-person', title: 'Add a new person', text: 'Add a new member to the People list, with a photo and links if you have them.', to: '/people/new', areas: ['people_add'] },
  { id: 'people', title: 'Find or update a person', text: "Change a member's title, photo or links, or delete a person who was added by mistake.", to: '/people', areas: ['people_add', 'people_edit', 'people_delete'] },
  { id: 'accounts', title: 'Manage accounts', text: 'Make an account, change what someone may do, switch an account off or give a new temporary password.', to: '/accounts', areas: ['accounts'] },
]

// the parts of the site the admin has no screens for yet; a user who is allowed to work on them is told, so that nothing seems to be missing without a reason
const COMING = [
  { id: 'theme', title: 'Edit the theme pages', text: 'The words, research areas, highlight cards and contacts of each research theme.', area: 'theme' },
  { id: 'projects', title: 'Keep the funded projects', text: 'The ongoing and ended projects of every theme.', area: 'projects' },
  { id: 'site', title: 'Edit the site pages', text: "The collaborators, the footer's numbers and the introductions of the People and Collaborations pages.", area: 'site' },
]

export default function Home() {
  const { user, can } = useAuth()
  const tasks = TASKS.filter((task) => task.areas.some(can))
  const soon = COMING.filter((item) => can(item.area))
  return (
    <div className="page">
      <PageHeading title="Home">What would you like to do?</PageHeading>
      <FlashNotice />
      <p className="lead">Signed in as {user.name}.</p>
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
      {soon.length > 0 && (
        <section aria-labelledby="soon-heading" className="stack">
          <h2 id="soon-heading">Coming soon</h2>
          <p className="muted">Your account is allowed to do these, but the admin has no screen for them yet.</p>
          <ul className="task-list">
            {soon.map((item) => (
              <li key={item.id}>
                <div className="task-card task-soon">
                  <span className="task-title">{item.title}</span>
                  <span className="task-text">{item.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {tasks.length === 0 && soon.length === 0 && <Notice kind="info">Your account is not allowed to do anything in the admin yet. Ask the administrative staff to give you access.</Notice>}
    </div>
  )
}
