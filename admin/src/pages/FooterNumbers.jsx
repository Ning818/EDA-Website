import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Button, ErrorSummary, Lead, LoadError, Loading, Notice, PageHeading, TextField } from '../components/ui'
import { useForm } from '../useForm'
import { useLoad } from '../useLoad'

const PHONE_CHARS = /^\+?[0-9 ()./-]+$/

// the same check as the API's, so that a mistyped number is caught before it is sent: 6 to 15 digits with only the spaces and signs a number has
function problem(value, label) {
  const text = value.trim().replace(/\s+/g, ' ')
  if (!text) return null
  const digits = (text.match(/\d/g) ?? []).length
  if (!PHONE_CHARS.test(text) || digits < 6 || digits > 15) return `${label} must be a phone number: 6 to 15 digits, which may have spaces, ( ) . / - between them and a + at the start.`
  if (text.length > 40) return `${label} must be at most 40 characters long.`
  return null
}

// what the footer's phone link dials: the digits, and a + where there is one at the start
const dialable = (phone) => {
  const digits = phone.replace(/\D/g, '')
  return digits ? `${phone.trim().startsWith('+') ? '+' : ''}${digits}` : null
}

function FooterForm({ site, onSaved }) {
  const initial = { phone: site.phone ?? '', fax: site.fax ?? '' }
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
    const phone = problem(v.phone, 'The phone number')
    const fax = problem(v.fax, 'The fax number')
    if (phone) found['footer-phone'] = phone
    if (fax) found['footer-fax'] = fax
    return found
  }
  // only a number that was changed is sent; one that was emptied is sent as null, which takes the line out of the footer
  const send = async (v) => {
    const body = {}
    for (const key of ['phone', 'fax']) {
      const value = v[key].trim().replace(/\s+/g, ' ')
      if (value !== initial[key]) body[key] = value || null
    }
    if (!Object.keys(body).length) {
      setNothing(true)
      return
    }
    await api.patch('/api/admin/site/contact', body)
    onSaved()
  }
  const fieldFor = (error) => (error.code === 'invalid_input' && ['phone', 'fax'].includes(error.field) ? `footer-${error.field}` : null)

  const dial = form.values.phone.trim() && !problem(form.values.phone, '') ? dialable(form.values.phone) : null
  return (
    <form onSubmit={(event) => form.submit(event, { validate, send, fieldFor })} noValidate className="card stack">
      <ErrorSummary errors={form.errors} version={form.version} />
      {form.failure && (
        <Notice kind="error" focusOnShow>
          {form.failure}
        </Notice>
      )}
      {nothing && <Notice kind="info">Nothing was changed.</Notice>}
      <TextField
        id="footer-phone"
        label="Phone number"
        hint="For example +39 011 090 7042. Leave it empty to take the line out of the footer."
        type="tel"
        inputMode="tel"
        autoComplete="off"
        {...bind('phone')}
        error={form.errors['footer-phone']}
      />
      {dial && <p className="meta">Visitors who tap the phone number dial {dial}.</p>}
      <TextField
        id="footer-fax"
        label="Fax number"
        hint="For example +39 011 090 7099. Leave it empty to take the line out of the footer."
        type="tel"
        inputMode="tel"
        autoComplete="off"
        {...bind('fax')}
        error={form.errors['footer-fax']}
      />
      <div>
        <Button type="submit" variant="primary" busy={form.busy}>
          Save the numbers
        </Button>
      </div>
    </form>
  )
}

export default function FooterNumbers() {
  const site = useLoad(() => api.get('/api/site'), [])
  const [saved, setSaved] = useState(0)
  const [notice, setNotice] = useState(null)

  return (
    <div className="page page-narrow">
      <Link to="/site" className="back-link">
        Back to the site text
      </Link>
      <PageHeading>Footer numbers</PageHeading>
      <Lead>The phone and fax numbers in the footer of every page. On a phone, a visitor can tap the number to dial it. Check each digit.</Lead>
      {notice && <Notice kind="ok">{notice}</Notice>}
      {site.status === 'loading' && <Loading>Loading the numbers…</Loading>}
      {site.status === 'error' && <LoadError error={site.error} onRetry={site.reload} />}
      {site.status === 'ok' && (
        <FooterForm
          key={saved}
          site={site.data}
          onSaved={() => {
            setNotice('The footer now shows the new numbers.')
            setSaved((n) => n + 1)
            site.reload()
          }}
        />
      )}
    </div>
  )
}
