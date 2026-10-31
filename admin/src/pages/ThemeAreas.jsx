import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import FlashNotice from '../components/FlashNotice'
import { Button, ErrorSummary, Lead, LoadError, Loading, Notice, PageHeading, TextField } from '../components/ui'
import { useForm } from '../useForm'
import { useLoad } from '../useLoad'

function AddArea({ slug }) {
  const navigate = useNavigate()
  const form = useForm({ title: '' })
  const validate = (v) => (!v.title.trim() ? { 'area-title': 'Enter the title of the research area.' } : v.title.trim().length > 200 ? { 'area-title': 'The title must be at most 200 characters long.' } : {})
  const send = async (v) => {
    const area = await api.post(`/api/admin/themes/${slug}/areas`, { title: v.title.trim() })
    navigate(`/themes/${slug}/areas/${area.id}`, { state: { notice: `The research area "${area.title}" was added at the end. Add its topics and its people below.` } })
  }
  const fieldFor = (error) => (error.code === 'invalid_input' && error.field === 'title' ? 'area-title' : null)
  return (
    <form onSubmit={(event) => form.submit(event, { validate, send, fieldFor })} noValidate className="card stack">
      <h2>Add a research area</h2>
      <ErrorSummary errors={form.errors} version={form.version} />
      {form.failure && (
        <Notice kind="error" focusOnShow>
          {form.failure}
        </Notice>
      )}
      <TextField id="area-title" label="Title" required autoComplete="off" hint="For example: Gene expression, regulatory networks and modeling. It goes at the end." {...form.bind('title')} error={form.errors['area-title']} />
      <div>
        <Button type="submit" variant="primary" busy={form.busy}>
          Add research area
        </Button>
      </div>
    </form>
  )
}

/** The research areas of a theme in their order: each opens its page, can be moved up or down, and a new one is added at the end. */
export default function ThemeAreas() {
  const { slug } = useParams()
  const { status, data: theme, error, reload } = useLoad(() => api.get(`/api/admin/themes/${slug}`), [slug])
  const [failure, setFailure] = useState(null)
  const focus = useRef(null)

  // after a move the list is loaded again; the focus goes back to the button that was used, so that a keyboard user can press it again
  useEffect(() => {
    if (focus.current && status === 'ok') {
      document.getElementById(focus.current)?.focus()
      focus.current = null
    }
  }, [theme, status])

  async function move(area, direction) {
    setFailure(null)
    try {
      await api.post(`/api/admin/areas/${area.id}/move`, { direction })
      focus.current = `area-${area.id}-${direction}`
      reload()
    } catch (problem) {
      setFailure(problem.message)
    }
  }

  return (
    <div className="page page-narrow">
      <Link to={`/themes/${slug}`} className="back-link">
        Back to the theme
      </Link>
      <PageHeading>Research areas</PageHeading>
      <Lead>The research areas of the theme's Research page. Each has its topics and its involved people.</Lead>
      <FlashNotice />
      {failure && <Notice kind="error">{failure}</Notice>}
      {status === 'loading' && !theme && <Loading>Loading the theme…</Loading>}
      {status === 'error' && <LoadError error={error} onRetry={reload} />}
      {theme && (
        <>
          <section aria-labelledby="areas-list" className="card stack">
            <h2 id="areas-list">
              {theme.name} <span className="muted">({theme.areas.length})</span>
            </h2>
            {theme.areas.length === 0 ? (
              <p className="muted">There are no research areas yet.</p>
            ) : (
              <ol className="plain-list people-list">
                {theme.areas.map((area, index) => (
                  <li key={area.id} className="picker-row">
                    <Link to={`/themes/${slug}/areas/${area.id}`} className="picker-link">
                      <span className="person-name">{area.title}</span>
                    </Link>
                    <span className="row">
                      <Button id={`area-${area.id}-up`} aria-disabled={index === 0 ? 'true' : undefined} onClick={() => index > 0 && move(area, 'up')}>
                        Move up{' '}<span className="visually-hidden">{area.title}</span>
                      </Button>
                      <Button id={`area-${area.id}-down`} aria-disabled={index === theme.areas.length - 1 ? 'true' : undefined} onClick={() => index < theme.areas.length - 1 && move(area, 'down')}>
                        Move down{' '}<span className="visually-hidden">{area.title}</span>
                      </Button>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <AddArea slug={slug} />
        </>
      )}
    </div>
  )
}
