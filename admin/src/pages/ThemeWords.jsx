import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { Button, ErrorSummary, Loading, LoadError, Notice, PageHeading, TextAreaField, TextField } from '../components/ui'
import { useForm } from '../useForm'
import { useLoad } from '../useLoad'

const FIELDS = ['name', 'short_name', 'home_summary', 'intro']

function WordsForm({ theme }) {
  const navigate = useNavigate()
  const initial = { name: theme.name, short_name: theme.short_name ?? '', home_summary: theme.home_summary ?? '', intro: theme.intro }
  const form = useForm(initial)
  const [nothing, setNothing] = useState(false)
  const bind = (key) => {
    const bound = form.bind(key)
    return {
      ...bound,
      onChange: (event) => {
        setNothing(false)
        bound.onChange(event)
      },
    }
  }

  const validate = (v) => {
    const found = {}
    if (!v.name.trim()) found['words-name'] = 'Enter the name.'
    else if (v.name.trim().length > 100) found['words-name'] = 'The name must be at most 100 characters long.'
    if (v.short_name.trim().length > 50) found['words-short_name'] = 'The short name must be at most 50 characters long.'
    if (!v.intro.trim()) found['words-intro'] = 'Write the introduction.'
    else if (v.intro.trim().length > 1000) found['words-intro'] = 'The introduction must be at most 1000 characters long.'
    if (v.home_summary.trim().length > 1000) found['words-home_summary'] = 'The home page paragraph must be at most 1000 characters long.'
    return found
  }
  // only what was changed is sent; an optional text that was emptied is sent as null, which removes it
  const send = async (v) => {
    const body = {}
    for (const key of FIELDS) {
      const value = v[key].trim().replace(/\s+/g, ' ')
      if (value !== initial[key].trim().replace(/\s+/g, ' ')) body[key] = key === 'short_name' || key === 'home_summary' ? value || null : value
    }
    if (!Object.keys(body).length) {
      setNothing(true)
      return
    }
    await api.patch(`/api/admin/themes/${theme.slug}`, body)
    navigate(`/themes/${theme.slug}`, { state: { notice: `The words of ${body.name ?? theme.name} were saved.` } })
  }
  const fieldFor = (error) => (error.code === 'invalid_input' && FIELDS.includes(error.field) ? `words-${error.field}` : null)

  return (
    <form onSubmit={(event) => form.submit(event, { validate, send, fieldFor })} noValidate className="card stack-lg">
      <ErrorSummary errors={form.errors} version={form.version} />
      {form.failure && (
        <Notice kind="error" focusOnShow>
          {form.failure}
        </Notice>
      )}
      {nothing && <Notice kind="info">Nothing was changed.</Notice>}
      <div className="form-grid form-grid-2">
        <TextField id="words-name" label="Name" required autoComplete="off" hint="Shown in the navigation, the page titles and the home page. A long name can break the navigation." {...bind('name')} error={form.errors['words-name']} />
        <TextField id="words-short_name" label="Short name" autoComplete="off" hint="For the places where the name is too long. Leave it empty if the name does." {...bind('short_name')} error={form.errors['words-short_name']} />
      </div>
      <TextAreaField
        id="words-home_summary"
        label="Paragraph on the home page"
        rows={6}
        hint="The paragraph beside the theme's particle cloud on the home page. Leave it empty and the site shows the text it has built in. Plain text, at most 1000 characters."
        {...bind('home_summary')}
        error={form.errors['words-home_summary']}
      />
      <TextAreaField id="words-intro" label="Introduction of the Research page" required rows={6} hint="The paragraph under the title of the theme's Research page. Plain text, at most 1000 characters." {...bind('intro')} error={form.errors['words-intro']} />
      <p className="muted">The colours and the drawing in the page's header are part of the site's code, not of these words.</p>
      <div>
        <Button type="submit" variant="primary" busy={form.busy}>
          Save the words
        </Button>
      </div>
    </form>
  )
}

export default function ThemeWords() {
  const { slug } = useParams()
  const theme = useLoad(() => api.get(`/api/admin/themes/${slug}`), [slug])
  return (
    <div className="page page-narrow">
      <Link to={`/themes/${slug}`} className="back-link">
        Back to the theme
      </Link>
      <PageHeading>Change the words</PageHeading>
      {theme.status === 'loading' && <Loading>Loading the theme…</Loading>}
      {theme.status === 'error' && <LoadError error={theme.error} onRetry={theme.reload} />}
      {theme.status === 'ok' && <WordsForm theme={theme.data} />}
    </div>
  )
}
