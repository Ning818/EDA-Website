import { useState } from 'react'
import { api } from '../api/client'
import { Button, ConfirmDialog, Lead, LoadError, Loading, Notice, PageHeading, TextAreaField } from '../components/ui'
import { useLoad } from '../useLoad'

const ANSWER_MAX = 1000
const moment = (iso) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso))

function Card({ request, onAnswer }) {
  const waiting = request.status === 'open'
  return (
    <li className="card stack" style={{ margin: 0 }}>
      <h3>{request.user_name}</h3>
      <p className="meta">
        {request.user_email}, asked {moment(request.created_at)}
        {request.page ? `, from the page ${request.page}` : ''}
      </p>
      <p>{request.message}</p>
      {waiting ? (
        <div>
          <Button variant="primary" onClick={() => onAnswer(request)}>
            Answer it<span className="visually-hidden">: the request of {request.user_name}</span>
          </Button>
        </div>
      ) : (
        <p>
          <span className="badge badge-ok">Answered</span> <span className="meta">{moment(request.handled_at)} by {request.handled_by}</span>
          <br />
          {request.answer ?? <span className="muted">No answer was written.</span>}
        </p>
      )}
    </li>
  )
}

/** For the developer: what people could not find, with a way to answer each. */
export default function Requests() {
  const { status, data, error, reload } = useLoad(() => api.get('/api/admin/requests'), [])
  const [target, setTarget] = useState(null)
  const [answer, setAnswer] = useState('')
  const [problem, setProblem] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  function open(request) {
    setTarget(request)
    setAnswer('')
    setProblem(null)
  }

  async function close() {
    const text = answer.trim().replace(/\s+/g, ' ')
    if (text.length > ANSWER_MAX) {
      setProblem(`The answer must be at most ${ANSWER_MAX} characters long. It is ${text.length}.`)
      return
    }
    setBusy(true)
    setProblem(null)
    try {
      await api.post(`/api/admin/requests/${target.id}/close`, { answer: text || null })
      setMessage(`The request of ${target.user_name} is marked as answered.`)
      setTarget(null)
      reload()
    } catch (failure) {
      setProblem(failure.message)
    } finally {
      setBusy(false)
    }
  }

  const waiting = data ? data.requests.filter((r) => r.status === 'open') : []
  const done = data ? data.requests.filter((r) => r.status !== 'open') : []

  return (
    <div className="page">
      <PageHeading>Requests</PageHeading>
      <Lead>What people could not find or do with the screens. Answer the request, then mark it as answered.</Lead>
      {message && <Notice kind="ok">{message}</Notice>}
      {status === 'loading' && <Loading>Loading the requests…</Loading>}
      {status === 'error' && <LoadError error={error} onRetry={reload} />}
      {status === 'ok' && (
        <>
          <section aria-labelledby="waiting-heading" className="stack">
            <h2 id="waiting-heading">
              Waiting for an answer <span className="muted">({waiting.length})</span>
            </h2>
            {waiting.length === 0 ? (
              <p className="muted">No request is waiting.</p>
            ) : (
              <ul className="plain-list stack">
                {waiting.map((request) => (
                  <Card key={request.id} request={request} onAnswer={open} />
                ))}
              </ul>
            )}
          </section>
          {done.length > 0 && (
            <section aria-labelledby="done-heading" className="stack">
              <h2 id="done-heading">
                Answered <span className="muted">({done.length})</span>
              </h2>
              <ul className="plain-list stack">
                {done.map((request) => (
                  <Card key={request.id} request={request} onAnswer={open} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <ConfirmDialog
        open={target !== null}
        title={target ? `Answer the request of ${target.user_name}` : 'Answer the request'}
        confirmLabel="Mark as answered"
        onConfirm={close}
        onCancel={() => setTarget(null)}
        busy={busy}
      >
        {target && <p className="muted">{target.message}</p>}
        <TextAreaField
          id="request-answer"
          label="Your answer"
          hint={`It is shown to ${target?.user_name ?? 'the person'} on the page where they asked. You may leave it empty. At most ${ANSWER_MAX} characters.`}
          rows={4}
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          error={problem}
        />
      </ConfirmDialog>
    </div>
  )
}
