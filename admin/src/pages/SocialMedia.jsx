import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Button, ErrorSummary, Loading, LoadError, Notice, PageHeading, TextAreaField, TextField } from '../components/ui'
import { isWebAddress, useForm } from '../useForm'
import { useLoad } from '../useLoad'

// the same limits as the API's (backend/app/services/site.py)
const LABEL_MAX = 30
const TEXT_MAX = 450
const CTA_MAX = 60

// the two blocks of the home page, in the order of its animation; the API has exactly these
const BLOCKS = [
  { slug: 'youtube', name: 'YouTube' },
  { slug: 'linkedin', name: 'LinkedIn' },
]

const tidy = (value) => value.trim().replace(/\s+/g, ' ')

function BlockForm({ block, saved, onSaved }) {
  const form = useForm({ label: saved.label, text: saved.text, cta: saved.cta, url: saved.url })
  const [notice, setNotice] = useState(null)
  const id = (field) => `${block.slug}-${field}`

  const validate = (v) => {
    const found = {}
    const label = tidy(v.label)
    const text = tidy(v.text)
    const cta = tidy(v.cta)
    const url = v.url.trim()
    if (!label) found[id('label')] = 'Enter the heading.'
    else if (label.length > LABEL_MAX) found[id('label')] = `The heading must be at most ${LABEL_MAX} characters long.`
    if (!text) found[id('text')] = 'Write the text.'
    else if (text.length > TEXT_MAX) found[id('text')] = `The text must be at most ${TEXT_MAX} characters long. It is ${text.length}.`
    else if (/[<>]/.test(text)) found[id('text')] = 'The text must be plain text, without < or >.'
    if (!cta) found[id('cta')] = 'Enter the words of the button.'
    else if (cta.length > CTA_MAX) found[id('cta')] = `The words of the button must be at most ${CTA_MAX} characters long.`
    if (!url) found[id('url')] = 'Enter the address.'
    else if (!isWebAddress(url)) found[id('url')] = 'The address must be a web address starting with http:// or https://.'
    return found
  }

  const send = async (v) => {
    const body = { label: tidy(v.label), text: tidy(v.text), cta: tidy(v.cta), url: v.url.trim() }
    if (body.label === saved.label && body.text === saved.text && body.cta === saved.cta && body.url === saved.url) {
      setNotice({ kind: 'info', text: 'Nothing was changed.' })
      return
    }
    const answer = await api.put(`/api/admin/site/social/${block.slug}`, body)
    onSaved(answer)
    for (const field of ['label', 'text', 'cta', 'url']) form.set(field, answer[field])
    setNotice({ kind: 'ok', text: `The ${block.name} block was saved. The icon in the footer leads to the new address too.` })
  }
  const fieldFor = (error) => (error.code === 'invalid_input' && ['label', 'text', 'cta', 'url'].includes(error.field) ? id(error.field) : null)

  return (
    <form
      onSubmit={(event) => {
        setNotice(null)
        return form.submit(event, { validate, send, fieldFor })
      }}
      noValidate
      className="stack"
    >
      <ErrorSummary errors={form.errors} version={form.version} />
      {form.failure && (
        <Notice kind="error" focusOnShow>
          {form.failure}
        </Notice>
      )}
      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
      <TextField id={id('label')} label="Heading above the text" hint={`A word or two, for example ${block.name}. At most ${LABEL_MAX} characters.`} required autoComplete="off" {...form.bind('label')} error={form.errors[id('label')]} />
      <TextAreaField
        id={id('text')}
        label="Text"
        hint={`Plain text, at most ${TEXT_MAX} characters. A longer text can break the layout of the home page.`}
        rows={6}
        required
        {...form.bind('text')}
        error={form.errors[id('text')]}
      />
      <p className="meta">
        {tidy(form.values.text).length} of {TEXT_MAX} characters.
      </p>
      <TextField id={id('cta')} label="Words of the button" hint={`For example "Explore our ${block.name} channel". At most ${CTA_MAX} characters.`} required autoComplete="off" {...form.bind('cta')} error={form.errors[id('cta')]} />
      <TextField
        id={id('url')}
        label="Address the button leads to"
        hint="A web address starting with https://. The icon in the footer of every page leads to it too."
        type="url"
        inputMode="url"
        required
        autoComplete="off"
        {...form.bind('url')}
        error={form.errors[id('url')]}
      />
      <div>
        <Button type="submit" variant="primary" busy={form.busy}>
          Save the {block.name} block
        </Button>
      </div>
    </form>
  )
}

/** The two social media blocks of the home page: what they say, the words of their buttons, and where the buttons and the footer's icons lead. Each block is saved on its own. */
export default function SocialMedia() {
  const { status, data, error, reload } = useLoad(() => api.get('/api/site/social'), [])
  const [saved, setSaved] = useState({})

  return (
    <div className="page page-narrow">
      <Link to="/site" className="back-link">
        Back to the site text
      </Link>
      <PageHeading>Social media</PageHeading>
      <p className="lead">The YouTube and the LinkedIn blocks of the home page, and where the icons in the footer lead. Each block is saved on its own.</p>
      {status === 'loading' && <Loading>Loading the social media blocks…</Loading>}
      {status === 'error' && <LoadError error={error} onRetry={reload} />}
      {status === 'ok' &&
        BLOCKS.map((block) => {
          const current = saved[block.slug] ?? data.find((row) => row.slug === block.slug)
          return (
            <section key={block.slug} aria-labelledby={`heading-${block.slug}`} className="card stack">
              <h2 id={`heading-${block.slug}`}>{block.name} block</h2>
              {current ? <BlockForm block={block} saved={current} onSaved={(answer) => setSaved((now) => ({ ...now, [block.slug]: answer }))} /> : <Notice kind="error">The {block.name} block is not set up on the server.</Notice>}
            </section>
          )
        })}
    </div>
  )
}
