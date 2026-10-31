import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { Button, ErrorSummary, Lead, LoadError, Loading, Notice, PageHeading, TextAreaField } from '../components/ui'
import { useForm } from '../useForm'
import { useLoad } from '../useLoad'

const MESSAGE_MAX = 1500
const moment = (iso) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso))

function Ask({ page, onSent }) {
  const form = useForm({ message: '' })
  const validate = (v) => {
    const text = v.message.trim().replace(/\s+/g, ' ')
    if (!text) return { 'help-message': 'Say what you need. The request is empty.' }
    if (text.length > MESSAGE_MAX) return { 'help-message': `The request must be at most ${MESSAGE_MAX} characters long. It is ${text.length}.` }
    if (/[<>]/.test(text)) return { 'help-message': 'The request must be plain text, without < or >.' }
    return {}
  }
  const send = async (v) => {
    await api.post('/api/admin/requests', { message: v.message, page })
    onSent()
  }
  const fieldFor = (error) => (error.code === 'invalid_input' && error.field === 'message' ? 'help-message' : null)

  return (
    <form onSubmit={(event) => form.submit(event, { validate, send, fieldFor })} noValidate className="card stack">
      <ErrorSummary errors={form.errors} version={form.version} />
      {form.failure && (
        <Notice kind="error" focusOnShow>
          {form.failure}
        </Notice>
      )}
      <TextAreaField
        id="help-message"
        label="What do you need?"
        hint={`Say what you want to do, and where you looked for it. The developer reads it and answers on this page. At most ${MESSAGE_MAX} characters.`}
        rows={6}
        required
        {...form.bind('message')}
        error={form.errors['help-message']}
      />
      {page && <p className="meta">The request will say that you were on the page {page}.</p>}
      <div>
        <Button type="submit" variant="primary" busy={form.busy}>
          Send the request
        </Button>
      </div>
    </form>
  )
}

function Mine() {
  const { status, data, error, reload } = useLoad(() => api.get('/api/admin/requests/mine'), [])
  return (
    <section aria-labelledby="mine-heading" className="stack">
      <h2 id="mine-heading">Your requests</h2>
      {status === 'loading' && <Loading>Loading your requests…</Loading>}
      {status === 'error' && <LoadError error={error} onRetry={reload} />}
      {status === 'ok' &&
        (data.requests.length === 0 ? (
          <p className="muted">You have not asked for anything yet.</p>
        ) : (
          <ul className="plain-list stack">
            {data.requests.map((request) => (
              <li key={request.id} className="card stack" style={{ margin: 0 }}>
                <p>
                  <span className={`badge ${request.status === 'done' ? 'badge-ok' : 'badge-warn'}`}>{request.status === 'done' ? 'Answered' : 'Waiting for an answer'}</span>{' '}
                  <span className="meta">Asked {moment(request.created_at)}</span>
                </p>
                <p>{request.message}</p>
                {request.status === 'done' && (
                  <p>
                    <strong>Answer:</strong> {request.answer ?? 'The staff marked this as done.'}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ))}
    </section>
  )
}

/** Where a user says what they could not find or do with the screens, and reads the answers. */
export default function Help() {
  const [search] = useSearchParams()
  const from = search.get('from')
  const page = from && from.startsWith('/') && !from.startsWith('//') ? from : null
  const [sent, setSent] = useState(0)
  const [notice, setNotice] = useState(false)

  return (
    <div className="page page-narrow">
      <PageHeading title="I can't find what I need">I can&apos;t find what I need</PageHeading>
      <Lead>If you cannot find where to change something, report it here. The developer will answer, and the answer appears on this page.</Lead>
      {notice && <Notice kind="ok">Your request was sent. The answer will appear under Your requests.</Notice>}
      <Ask
        key={sent}
        page={page}
        onSent={() => {
          setNotice(true)
          setSent((n) => n + 1)
        }}
      />
      <Mine key={`mine-${sent}`} />
    </div>
  )
}
