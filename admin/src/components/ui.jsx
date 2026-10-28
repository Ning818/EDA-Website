import { useEffect, useId, useRef } from 'react'
import { Link } from 'react-router-dom'

// The small parts every page is made of. They carry the accessibility: a label for every control, an error tied to its field, messages that are announced, a dialog that traps and
// returns focus, a heading that takes the focus when the page changes.

/** The page's one h1. It sets the title of the tab (what a screen reader reads first on a new page) and can be given the focus by the program after a page change. */
export function PageHeading({ children, title }) {
  const text = title ?? (typeof children === 'string' ? children : 'EDA Group admin')
  useEffect(() => {
    document.title = `${text} - EDA Group admin`
  }, [text])
  return <h1 tabIndex={-1}>{children}</h1>
}

/**
 * A message. `kind`: 'ok' | 'error' | 'warn' | 'info'. An error is announced at once (role alert); the others politely (role status). `focusOnShow` moves the focus to it,
 * for a message the user has to read before going on.
 */
export function Notice({ kind = 'info', title, children, focusOnShow = false, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    if (focusOnShow) ref.current?.focus()
  }, [focusOnShow])
  return (
    <div ref={ref} tabIndex={focusOnShow ? -1 : undefined} role={kind === 'error' ? 'alert' : 'status'} className={`notice notice-${kind} ${className}`}>
      {title && <h2>{title}</h2>}
      {children}
    </div>
  )
}

/** A list of what is wrong with a form, at its top, each linked to its field; it takes the focus when it appears (`version` changes with every failed submit). */
export function ErrorSummary({ errors, version }) {
  const ref = useRef(null)
  const list = Object.entries(errors).filter(([, message]) => message)
  useEffect(() => {
    if (version && list.length) ref.current?.focus()
    // only a new failed submit moves the focus, not every keystroke that changes the list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])
  if (!list.length) return null
  return (
    <div ref={ref} tabIndex={-1} role="alert" className="notice notice-error">
      <h2>{list.length === 1 ? 'There is a problem' : `There are ${list.length} problems`}</h2>
      <ul>
        {list.map(([id, message]) => (
          <li key={id}>
            <a href={`#${id}`} onClick={(event) => focusField(event, id)}>
              {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function focusField(event, id) {
  const element = document.getElementById(id)
  if (element) {
    event.preventDefault()
    element.focus()
  }
}

/** The label, hint and error around one control. Every control has a visible label; "required" is said in words. */
function Field({ id, label, hint, error, required, labelClass = '', children }) {
  return (
    <div className="field">
      <label htmlFor={id} className={`field-label ${labelClass}`.trim()}>
        {label}
        {required ? <span className="req"> (required)</span> : null}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} className="field-error">
          <span className="visually-hidden">Error: </span>
          {error}
        </p>
      )}
    </div>
  )
}

const describedBy = (id, hint, error) => [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined

export function TextField({ id: given, label, labelClass, hint, error, required, className = '', ...input }) {
  const generated = useId()
  const id = given ?? generated
  return (
    <Field id={id} label={label} labelClass={labelClass} hint={hint} error={error} required={required}>
      <input id={id} className={`input ${className}`} aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy(id, hint, error)} aria-required={required ? 'true' : undefined} {...input} />
    </Field>
  )
}

export function SelectField({ id: given, label, hint, error, required, children, ...select }) {
  const generated = useId()
  const id = given ?? generated
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required}>
      <select id={id} className="input" aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy(id, hint, error)} aria-required={required ? 'true' : undefined} {...select}>
        {children}
      </select>
    </Field>
  )
}

export function TextAreaField({ id: given, label, hint, error, required, rows = 4, ...input }) {
  const generated = useId()
  const id = given ?? generated
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required}>
      <textarea id={id} rows={rows} className="input" aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy(id, hint, error)} aria-required={required ? 'true' : undefined} {...input} />
    </Field>
  )
}

export function FileField({ id: given, label, hint, error, required, ...input }) {
  const generated = useId()
  const id = given ?? generated
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required}>
      <input id={id} type="file" className="input" aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy(id, hint, error)} aria-required={required ? 'true' : undefined} {...input} />
    </Field>
  )
}

export function CheckboxField({ id: given, label, hint, error, required, ...input }) {
  const generated = useId()
  const id = given ?? generated
  return (
    <div className="field">
      <div className="check">
        <input id={id} type="checkbox" aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy(id, hint, error)} aria-required={required ? 'true' : undefined} {...input} />
        <label htmlFor={id}>
          {label}
          {required ? <span className="muted"> (required)</span> : null}
        </label>
      </div>
      {hint && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error">
          <span className="visually-hidden">Error: </span>
          {error}
        </p>
      )}
    </div>
  )
}

export function Button({ variant = 'secondary', busy = false, children, type = 'button', ...props }) {
  const cls = variant === 'primary' ? 'btn btn-primary' : variant === 'danger' ? 'btn btn-danger' : 'btn'
  // a busy button stays focusable and says so, instead of vanishing under the keyboard focus
  return (
    <button type={type} className={cls} aria-disabled={busy ? 'true' : undefined} {...props} onClick={busy ? (event) => event.preventDefault() : props.onClick}>
      {busy ? 'Please wait…' : children}
    </button>
  )
}

export function LinkButton({ to, variant = 'secondary', children, ...props }) {
  return (
    <Link to={to} className={variant === 'primary' ? 'btn btn-primary' : 'btn'} {...props}>
      {children}
    </Link>
  )
}

/**
 * A modal that asks before something that is hard to undo. It is the browser's own dialog: focus goes into it and stays in it, Escape cancels, and focus returns to what opened it.
 * It opens while `open` is true; `onCancel` is called when it is dismissed.
 */
export function ConfirmDialog({ open, title, children, confirmLabel, cancelLabel = 'Cancel', onConfirm, onCancel, danger = false, busy = false }) {
  const ref = useRef(null)
  const opener = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      opener.current = document.activeElement
      dialog.showModal()
      // a question about something that is hard to undo starts on the safe answer, so that pressing Enter or Space by reflex does not do it
      if (danger) dialog.querySelector('[data-cancel]')?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open, danger])
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={() => {
        if (opener.current && document.contains(opener.current)) opener.current.focus()
        if (open) onCancel()
      }}
      onCancel={() => {}}
    >
      <div className="stack">
        <h2 id={titleId}>{title}</h2>
        <div className="stack">{children}</div>
        <div className="row">
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} busy={busy}>
            {confirmLabel}
          </Button>
          <Button onClick={onCancel} data-cancel>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}

/** What a page shows while its data is on its way, and when it could not get it. */
export function Loading({ children = 'Loading…' }) {
  return (
    <p role="status" className="muted">
      {children}
    </p>
  )
}

export function LoadError({ error, onRetry }) {
  return (
    <Notice kind="error" title="Could not load this page">
      <p>{error?.message ?? 'Something went wrong.'}</p>
      {onRetry && (
        <p style={{ marginTop: '0.75rem' }}>
          <Button onClick={onRetry}>Try again</Button>
        </p>
      )}
    </Notice>
  )
}
