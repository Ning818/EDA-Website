import { Link } from 'react-router-dom'
import { PageHeading } from '../components/ui'

const TASKS = [
  { to: '/site/intros', title: 'Page introductions', text: 'The paragraph under the title of the People page and of the Collaborations page.' },
  { to: '/site/footer', title: 'Footer numbers', text: 'The phone and fax numbers at the foot of every page.' },
]

/** The words of the site that the administrative staff keep, other than the people and the collaborations: one card for each task. */
export default function Site() {
  return (
    <div className="page">
      <PageHeading>Site text</PageHeading>
      <p className="lead">What would you like to change?</p>
      <ul className="task-list" aria-label="Site text you can change">
        {TASKS.map((task) => (
          <li key={task.to}>
            <Link to={task.to} className="task-card">
              <span className="task-title">{task.title}</span>
              <span className="task-text">{task.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
