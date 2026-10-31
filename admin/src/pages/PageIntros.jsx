import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Button, ErrorSummary, Lead, LoadError, Loading, Notice, PageHeading, TextAreaField } from '../components/ui'
import { INTRO_PAGES } from '../labels'
import { useForm } from '../useForm'
import { useLoad } from '../useLoad'

const MAX = 1000

function IntroForm({ page, text }) {
  const [current, setCurrent] = useState(text)
  const [notice, setNotice] = useState(null)
  const form = useForm({ intro: text })
  const id = `intro-${page.slug}`

  const validate = (v) => {
    if (!v.intro.trim()) return { [id]: 'Write the paragraph.' }
    if (v.intro.trim().length > MAX) return { [id]: `The paragraph must be at most ${MAX} characters long.` }
    return {}
  }
  const send = async (v) => {
    const intro = v.intro.trim().replace(/\s+/g, ' ')
    if (intro === current) {
      setNotice('Nothing was changed.')
      return
    }
    const answer = await api.put(`/api/admin/site/pages/${page.slug}`, { intro })
    setCurrent(answer.intro)
    form.set('intro', answer.intro)
    setNotice(`The paragraph of the ${page.label} page was saved.`)
  }
  const fieldFor = (error) => (error.code === 'invalid_input' && error.field === 'intro' ? id : null)

  return (
    <form onSubmit={(event) => { setNotice(null); return form.submit(event, { validate, send, fieldFor }) }} noValidate className="stack">
      <ErrorSummary errors={form.errors} version={form.version} />
      {form.failure && (
        <Notice kind="error" focusOnShow>
          {form.failure}
        </Notice>
      )}
      {notice && <Notice kind="ok">{notice}</Notice>}
      <TextAreaField
        id={id}
        label={`Paragraph under the title of the ${page.label} page`}
        hint={`Plain text, at most ${MAX} characters. A longer text can break the layout of the page.`}
        rows={6}
        required
        {...form.bind('intro')}
        error={form.errors[id]}
      />
      <p className="meta">
        {form.values.intro.trim().length} of {MAX} characters.
      </p>
      <div>
        <Button type="submit" variant="primary" busy={form.busy}>
          Save the paragraph
        </Button>
      </div>
    </form>
  )
}

function IntroSection({ page }) {
  const intro = useLoad(() => api.get(`/api/pages/${page.slug}`), [page.slug])
  return (
    <section aria-labelledby={`heading-${page.slug}`} className="card stack">
      <h2 id={`heading-${page.slug}`}>{page.label} page</h2>
      {intro.status === 'loading' && <Loading>Loading the paragraph…</Loading>}
      {intro.status === 'error' && <LoadError error={intro.error} onRetry={intro.reload} />}
      {intro.status === 'ok' && <IntroForm page={page} text={intro.data.intro} />}
    </section>
  )
}

export default function PageIntros() {
  return (
    <div className="page page-narrow">
      <Link to="/site" className="back-link">
        Back to the site text
      </Link>
      <PageHeading>Page introductions</PageHeading>
      <Lead>The text under the title of the People and Collaborations pages. Each page is saved on its own.</Lead>
      {INTRO_PAGES.map((page) => (
        <IntroSection key={page.slug} page={page} />
      ))}
    </div>
  )
}
