import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import AuthFrame from '../components/AuthFrame'
import { Button, ErrorSummary, Notice, TextField } from '../components/ui'

export default function Login() {
  const { status, login } = useAuth()
  const { state } = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [failure, setFailure] = useState(null)
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(false)

  // already logged in (or just now): on to where the user was going; a user on a temporary password is sent on from there to change it
  if (status === 'ready') return <Navigate to={state?.from?.pathname ?? '/'} replace />

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setFailure(null)
    const found = {}
    if (!email.trim()) found['login-email'] = 'Enter your email address.'
    if (!password) found['login-password'] = 'Enter your password.'
    setErrors(found)
    if (Object.keys(found).length) {
      setVersion((n) => n + 1)
      return
    }
    setBusy(true)
    try {
      await login(email.trim(), password)
    } catch (error) {
      setFailure(error.code === 'unauthorized' ? 'The email or the password is not right.' : error.message)
      setPassword('')
      setBusy(false)
    }
  }

  return (
    <AuthFrame title="Log in">
      {state?.expired && <Notice kind="warn">Your login has ended. Log in again to go on.</Notice>}
      <p className="lead">For the staff who keep the EDA Group website up to date.</p>
      <form onSubmit={submit} noValidate className="card stack">
        <ErrorSummary errors={errors} version={version} />
        {failure && (
          <Notice kind="error" focusOnShow>
            {failure}
          </Notice>
        )}
        <TextField id="login-email" label="Email address" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} error={errors['login-email']} />
        <TextField id="login-password" label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} error={errors['login-password']} />
        <div>
          <Button type="submit" variant="primary" busy={busy}>
            Log in
          </Button>
        </div>
      </form>
    </AuthFrame>
  )
}
