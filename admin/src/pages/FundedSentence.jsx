import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import FlashNotice from '../components/FlashNotice'
import { Button, ErrorSummary, Lead, LoadError, Loading, Notice, PageHeading, Sentences, TextAreaField } from '../components/ui'
import { byCode } from '../sorting'
import { useForm } from '../useForm'
import { useLoad } from '../useLoad'

function ProjectNames({ title, tone, projects }) {
  return (
    <div>
      <h3 className={`status-heading ${tone}`}>
        {title} ({projects.length})
      </h3>
      {projects.length ? (
        <ul>
          {[...projects].sort(byCode).map((project, index) => (
            <li key={`${project.code}-${index}`}>{project.code ? `${project.code}: ${project.description}` : project.description}</li>
          ))}
        </ul>
      ) : (
        <p className="muted">None.</p>
      )}
    </div>
  )
}

function SentenceForm({ theme }) {
  const navigate = useNavigate()
  const form = useForm({ text: theme.funded_blurb })

  const validate = (v) => {
    if (!v.text.trim()) return { 'sentence-text': 'Write the Guided Introduction.' }
    if (v.text.trim().length > 600) return { 'sentence-text': 'The Guided Introduction must be at most 600 characters long.' }
    return {}
  }
  const send = async (v) => {
    await api.put(`/api/admin/themes/${theme.slug}/funded-blurb`, { text: v.text.trim() })
    navigate('/projects', { state: { notice: `The Guided Introduction of ${theme.name} was saved.` } })
  }
  const fieldFor = (error) => (error.code === 'invalid_input' && error.field === 'text' ? 'sentence-text' : null)

  return (
    <form onSubmit={(event) => form.submit(event, { validate, send, fieldFor })} noValidate className="stack">
      <ErrorSummary errors={form.errors} version={form.version} />
      {form.failure && (
        <Notice kind="error" focusOnShow>
          {form.failure}
        </Notice>
      )}
      <TextAreaField
        id="sentence-text"
        label="The Guided Introduction in the research page"
        hint="Plain text, at most 600 characters. For example: Ongoing projects include R2POWER300 and R3POWERUP …"
        rows={5}
        required
        {...form.bind('text')}
        error={form.errors['sentence-text']}
      />
      <div className="row">
        <Button type="submit" variant="primary" busy={form.busy}>
          Save the Guided Introduction
        </Button>
        <Link className="btn" to="/projects" state={{ notice: `The Guided Introduction of ${theme.name} was left as it is.` }}>
          It still fits: leave it as it is
        </Link>
      </div>
    </form>
  )
}

/**
 * The Guided Introduction in the Funded projects card of a theme's Research page. It is written by hand and nothing changes it but this page. The page opens after a project was added, ended or
 * changed (`state.ask`), to ask whether the Guided Introduction still fits the projects, and it can be opened from the list of projects at any time.
 */
export default function FundedSentence() {
  const { slug } = useParams()
  const { state } = useLocation()
  const theme = useLoad(() => api.get(`/api/themes/${slug}`), [slug])

  if (theme.status === 'loading') {
    return (
      <div className="page">
        <PageHeading title="The Guided Introduction">The Guided Introduction</PageHeading>
        <Loading>Loading the theme…</Loading>
      </div>
    )
  }
  if (theme.status === 'error') {
    return (
      <div className="page page-narrow">
        <PageHeading>{theme.error.status === 404 ? 'Theme not found' : 'Could not load this theme'}</PageHeading>
        {theme.error.status === 404 ? <Link to="/projects">Back to the funded projects</Link> : <LoadError error={theme.error} onRetry={theme.reload} />}
      </div>
    )
  }

  const t = theme.data
  return (
    <div className="page page-narrow">
      <Link to="/projects" className="back-link">
        Back to the funded projects
      </Link>
      <PageHeading title={`The Guided Introduction of ${t.name}`}>The Guided Introduction of {t.name}</PageHeading>
      <FlashNotice key={state?.notice} />
      <Lead wide>
        {state?.ask && (
          <>
            <Sentences>The projects of this theme have changed.</Sentences>
            <br />
          </>
        )}
        <Sentences>It is in the Funded projects card of {t.name} research page.</Sentences>
        <br />
        <Sentences>It is written by hand. Check if it still fits the projects below.</Sentences>
      </Lead>
      <section aria-labelledby="sentence-heading" className="card stack">
        <h2 id="sentence-heading">Does the Guided Introduction still fit?</h2>
        <SentenceForm theme={t} />
      </section>
      <section aria-labelledby="projects-heading" className="card stack">
        <h2 id="projects-heading">The projects of {t.name} now</h2>
        <ProjectNames title="Ongoing" tone="status-ongoing" projects={t.projects.ongoing} />
        <ProjectNames title="Ended" tone="status-ended" projects={t.projects.ended} />
      </section>
    </div>
  )
}
