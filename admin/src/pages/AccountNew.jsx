import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import TemporaryPassword from '../components/TemporaryPassword'
import { Button, ErrorSummary, Lead, LinkButton, Notice, PageHeading, SelectField, TextField } from '../components/ui'
import { PRESETS } from '../labels'


export default function AccountNew() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [access, setAccess] = useState('')
  const [errors, setErrors] = useState({})
  const [failure, setFailure] = useState(null)
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  const [made, setMade] = useState(null)

  const chosen = PRESETS.find((p) => p.value === access)

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setFailure(null)
    const found = {}
    if (!email.trim()) found['acc-email'] = 'Enter the email address.'
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) found['acc-email'] = 'That is not an email address.'
    if (!name.trim()) found['acc-name'] = 'Enter the name.'
    if (!access) found['acc-access'] = 'Choose what this person may do.'
    setErrors(found)
    if (Object.keys(found).length) {
      setVersion((n) => n + 1)
      return
    }
    setBusy(true)
    try {
      const answer = await api.post('/api/admin/accounts', { email: email.trim(), name: name.trim(), preset: access })
      setMade(answer)
    } catch (error) {
      if (error.code === 'email_taken' || error.code === 'invalid_account') setErrors({ 'acc-email': error.message })
      else if (error.code === 'invalid_input' && error.field === 'name') setErrors({ 'acc-name': error.message })
      else {
        setFailure(error.message)
        setBusy(false)
        return
      }
      setVersion((n) => n + 1)
      setBusy(false)
    }
  }

  if (made) {
    return (
      <div className="page page-narrow">
        <PageHeading>Account made</PageHeading>
        <TemporaryPassword title="The account is ready" name={made.account.name} email={made.account.email} password={made.temporary_password}>
          <div className="row">
            <LinkButton to="/accounts" variant="primary">
              Back to the accounts
            </LinkButton>
            <LinkButton to={`/accounts/${made.account.id}`}>Change this account</LinkButton>
          </div>
        </TemporaryPassword>
      </div>
    )
  }

  return (
    <div className="page page-narrow">
      <Link to="/accounts" className="back-link">
        Back to the accounts
      </Link>
      <PageHeading>Make a new account</PageHeading>
      <Lead>The next screen shows the temporary password once. The person must choose their own password at the first login.</Lead>
      <form onSubmit={submit} noValidate className="card stack">
        <ErrorSummary errors={errors} version={version} />
        {failure && (
          <Notice kind="error" focusOnShow>
            {failure}
          </Notice>
        )}
        <TextField id="acc-email" label="Email address" type="email" autoComplete="off" required value={email} onChange={(e) => setEmail(e.target.value)} error={errors['acc-email']} />
        <TextField id="acc-name" label="Full name" autoComplete="off" required value={name} onChange={(e) => setName(e.target.value)} error={errors['acc-name']} />
        <SelectField
          id="acc-access"
          label="What this person may do"
          required
          value={access}
          onChange={(e) => setAccess(e.target.value)}
          error={errors['acc-access']}
          hint={chosen ? chosen.description : 'Each choice is a set of things the person may do in the admin.'}
        >
          <option value="">Choose…</option>
          {PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </SelectField>
        <div>
          <Button type="submit" variant="primary" busy={busy}>
            Make the account
          </Button>
        </div>
      </form>
    </div>
  )
}
