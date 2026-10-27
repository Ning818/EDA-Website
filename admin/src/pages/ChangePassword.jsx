import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { Button, ErrorSummary, Notice, PageHeading, TextField } from '../components/ui'

export default function ChangePassword() {
  const { user, changePassword } = useAuth()
  const navigate = useNavigate()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [errors, setErrors] = useState({})
  const [failure, setFailure] = useState(null)
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  const forced = user.must_change_password

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setFailure(null)
    const found = {}
    if (!current) found['chg-current'] = forced ? 'Enter the temporary password you were given.' : 'Enter your current password.'
    if (!next) found['chg-new'] = 'Enter a new password.'
    else if (next.length < 12) found['chg-new'] = 'The new password must be at least 12 characters long.'
    else if (next === current) found['chg-new'] = 'The new password must be different from the current one.'
    if (next && !found['chg-new'] && again !== next) found['chg-again'] = 'The two new passwords are not the same.'
    setErrors(found)
    if (Object.keys(found).length) {
      setVersion((n) => n + 1)
      return
    }
    setBusy(true)
    try {
      await changePassword(current, next)
      navigate('/', { replace: true, state: { notice: 'Your password was changed.' } })
    } catch (error) {
      if (error.code === 'current_password_wrong') setErrors({ 'chg-current': 'The current password is not right.' })
      else if (error.code === 'invalid_password') setErrors({ 'chg-new': error.message })
      else setFailure(error.message)
      setVersion((n) => n + 1)
      setBusy(false)
    }
  }

  return (
    <div className="page page-narrow">
      <PageHeading>{forced ? 'Choose a password of your own' : 'Change your password'}</PageHeading>
      {forced && <Notice kind="info">You are using a temporary password. Choose a password of your own to go on; nothing else in the admin works until you do.</Notice>}
      <form onSubmit={submit} noValidate className="card stack">
        <ErrorSummary errors={errors} version={version} />
        {failure && (
          <Notice kind="error" focusOnShow>
            {failure}
          </Notice>
        )}
        <TextField id="chg-current" label={forced ? 'Temporary password' : 'Current password'} type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} error={errors['chg-current']} />
        <TextField
          id="chg-new"
          label="New password"
          hint="At least 12 characters. A phrase of a few words is fine."
          type="password"
          autoComplete="new-password"
          required
          value={next}
          onChange={(e) => setNext(e.target.value)}
          error={errors['chg-new']}
        />
        <TextField id="chg-again" label="New password again" type="password" autoComplete="new-password" required value={again} onChange={(e) => setAgain(e.target.value)} error={errors['chg-again']} />
        <div>
          <Button type="submit" variant="primary" busy={busy}>
            Change password
          </Button>
        </div>
      </form>
    </div>
  )
}
