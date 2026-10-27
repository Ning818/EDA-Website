import { useState } from 'react'
import { Button, Notice } from './ui'

/** The temporary password just set for an account. It is shown only here and only now: the API keeps nothing but a hash of it. */
export default function TemporaryPassword({ title, name, email, password, children }) {
  const [copied, setCopied] = useState(null)

  async function copy() {
    try {
      await navigator.clipboard.writeText(password)
      setCopied('The password was copied.')
    } catch {
      setCopied('The password could not be copied automatically. Select it and copy it by hand.')
    }
  }

  return (
    <Notice kind="ok" title={title} focusOnShow>
      <div className="stack">
        <p>
          Give this temporary password to <strong>{name}</strong> ({email}). They have to choose a password of their own the first time they log in.
        </p>
        <p>
          <span className="visually-hidden">Temporary password: </span>
          <span className="secret">{password}</span>
        </p>
        <p>
          <strong>It is shown only once.</strong> If it is lost, give the account a new temporary password.
        </p>
        <div className="row">
          <Button onClick={copy}>Copy the password</Button>
          <span role="status">{copied}</span>
        </div>
        {children}
      </div>
    </Notice>
  )
}
