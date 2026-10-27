import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/useAuth'
import TemporaryPassword from '../components/TemporaryPassword'
import { Button, ConfirmDialog, ErrorSummary, Loading, LoadError, Notice, PageHeading, SelectField, TextField } from '../components/ui'
import { AREA_LABELS, PRESETS, presetLabel } from '../labels'
import { useLoad } from '../useLoad'

const NONE = 'none'

export default function AccountEdit() {
  const { id } = useParams()
  const { user } = useAuth()
  const { status, data, error, reload } = useLoad(() => api.get('/api/admin/accounts'), [])
  const account = data?.find((a) => String(a.id) === id)
  // what the last action said (a message, a new temporary password): it must outlive the reload that follows the action
  const [flash, setFlash] = useState({ notice: null, reset: null })

  if (status === 'loading' && !data) {
    return (
      <div className="page">
        <PageHeading title="Account">Account</PageHeading>
        <Loading>Loading the account…</Loading>
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="page page-narrow">
        <PageHeading>Could not load the account</PageHeading>
        <LoadError error={error} onRetry={reload} />
      </div>
    )
  }
  if (!account) {
    return (
      <div className="page page-narrow">
        <PageHeading>Account not found</PageHeading>
        <p>There is no account with this number.</p>
        <div>
          <Link to="/accounts">Back to the accounts</Link>
        </div>
      </div>
    )
  }
  // the form is rebuilt from the saved account after each change
  return <AccountForm key={`${account.id}-${account.name}-${account.preset}-${account.is_active}`} account={account} mine={account.id === user.id} onChanged={reload} flash={flash} setFlash={setFlash} />
}

function AccountForm({ account, mine, onChanged, flash, setFlash }) {
  const [name, setName] = useState(account.name)
  const [access, setAccess] = useState(account.preset ?? (account.grants.length ? '' : NONE))
  const [errors, setErrors] = useState({})
  const [version, setVersion] = useState(0)
  const [failure, setFailure] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(null) // 'off' | 'reset'

  const say = (notice) => setFlash({ notice, reset: null })

  async function patch(changes, done) {
    setFailure(null)
    say(null)
    setBusy(true)
    try {
      await api.patch(`/api/admin/accounts/${account.id}`, changes)
      say(done)
      onChanged()
    } catch (error) {
      if (error.code === 'invalid_input') setErrors({ 'acc-name': error.message })
      else setFailure(error.message)
      setVersion((n) => n + 1)
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  function saveName(event) {
    event.preventDefault()
    if (!name.trim()) {
      setErrors({ 'acc-name': 'Enter the name.' })
      setVersion((n) => n + 1)
      return
    }
    setErrors({})
    if (name.trim() === account.name) {
      say('The name is the same as before, so nothing was changed.')
      return
    }
    patch({ name: name.trim() }, 'The name was changed.')
  }

  function saveAccess(event) {
    event.preventDefault()
    if (!access) {
      setErrors({ 'acc-access': 'Choose what this person may do, or "No access".' })
      setVersion((n) => n + 1)
      return
    }
    setErrors({})
    patch({ preset: access === NONE ? null : access }, 'What the person may do was changed.')
  }

  async function doReset() {
    setBusy(true)
    setFailure(null)
    try {
      const answer = await api.post(`/api/admin/accounts/${account.id}/reset-password`)
      setFlash({ notice: null, reset: answer.temporary_password })
      onChanged()
    } catch (error) {
      setFailure(error.message)
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  const chosen = PRESETS.find((p) => p.value === access)
  const current = account.grants.length ? account.grants.map((g) => AREA_LABELS[g.area] ?? g.area) : []

  return (
    <div className="page page-narrow">
      <Link to="/accounts" className="back-link">
        Back to the accounts
      </Link>
      <PageHeading title={account.name}>{account.name}</PageHeading>
      <p className="lead">
        {account.email} ·{' '}
        <span className={`badge ${account.is_active ? 'badge-ok' : 'badge-off'}`}>{account.is_active ? 'Active' : 'Switched off'}</span>
        {account.must_change_password && (
          <>
            {' '}
            <span className="badge badge-warn">Temporary password</span>
          </>
        )}
      </p>

      {flash.notice && <Notice kind="ok">{flash.notice}</Notice>}
      {failure && (
        <Notice kind="error" focusOnShow>
          {failure}
        </Notice>
      )}
      {flash.reset && <TemporaryPassword title="A new temporary password was set" name={account.name} email={account.email} password={flash.reset} />}
      {mine && (
        <Notice kind="info">
          This is your own account. You can change your name here. To change your password use "Change password" in the header; another person with access to accounts has to change what you may do or switch your account off.
        </Notice>
      )}

      <form onSubmit={saveName} noValidate className="card stack">
        <ErrorSummary errors={errors} version={version} />
        <h2>Name</h2>
        <TextField id="acc-name" label="Full name" required value={name} onChange={(e) => setName(e.target.value)} error={errors['acc-name']} autoComplete="off" />
        <div>
          <Button type="submit" busy={busy}>
            Save the name
          </Button>
        </div>
      </form>

      {!mine && (
        <>
          <form onSubmit={saveAccess} noValidate className="card stack">
            <h2>What this person may do</h2>
            <p>
              Now: <strong>{presetLabel(account)}</strong>
              {current.length > 0 && <span className="muted"> ({current.join(', ')})</span>}.
            </p>
            <SelectField
              id="acc-access"
              label="Change it to"
              required
              value={access}
              onChange={(e) => setAccess(e.target.value)}
              error={errors['acc-access']}
              hint={chosen ? chosen.description : access === NONE ? 'The person can log in but may not do anything.' : undefined}
            >
              <option value="">Choose…</option>
              {PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
              <option value={NONE}>No access</option>
            </SelectField>
            <div>
              <Button type="submit" busy={busy}>
                Save what they may do
              </Button>
            </div>
          </form>

          <section aria-labelledby="state-heading" className="card stack">
            <h2 id="state-heading">Switch the account {account.is_active ? 'off' : 'on'}</h2>
            <p>
              {account.is_active
                ? 'A switched-off account cannot log in, and anyone logged in with it is logged out at once. Nothing is deleted; you can switch it on again.'
                : 'The account cannot log in now. Switch it on to let the person log in again.'}
            </p>
            <div>
              {account.is_active ? (
                <Button variant="danger" onClick={() => setConfirm('off')}>
                  Switch the account off…
                </Button>
              ) : (
                <Button variant="primary" busy={busy} onClick={() => patch({ is_active: true }, 'The account was switched on.')}>
                  Switch the account on
                </Button>
              )}
            </div>
          </section>

          <section aria-labelledby="reset-heading" className="card stack">
            <h2 id="reset-heading">A new temporary password</h2>
            <p>If {account.name} has forgotten the password, give the account a new temporary password. Their old password stops working and they are logged out everywhere. They choose a new password at the next login.</p>
            <div>
              <Button onClick={() => setConfirm('reset')}>Give a new temporary password…</Button>
            </div>
          </section>
        </>
      )}

      <ConfirmDialog
        open={confirm === 'off'}
        title={`Switch off the account of ${account.name}?`}
        confirmLabel="Switch the account off"
        danger
        busy={busy}
        onConfirm={() => patch({ is_active: false }, 'The account was switched off.')}
        onCancel={() => setConfirm(null)}
      >
        <p>{account.name} will not be able to log in, and is logged out now. You can switch the account on again later.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === 'reset'}
        title={`Give ${account.name} a new temporary password?`}
        confirmLabel="Give a new temporary password"
        busy={busy}
        onConfirm={doReset}
        onCancel={() => setConfirm(null)}
      >
        <p>The old password stops working and {account.name} is logged out everywhere. The new temporary password is shown once, on this page.</p>
      </ConfirmDialog>
    </div>
  )
}
