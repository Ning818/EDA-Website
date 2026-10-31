import { useEffect, useMemo, useState } from 'react'
import { KINDS } from '../labels'
import { isWebAddress, useForm } from '../useForm'
import { Button, ErrorSummary, FileField, Notice, SelectField, TextField } from './ui'

const MAX_LOGO = 5 * 1024 * 1024
const LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const FIELDS = ['kind', 'name', 'url', 'logo']

/**
 * The form for a collaborator of a logo wall, to add one (`collaborator` empty) or to correct one. `onSave(formData)` sends it and rejects with the API's refusal: the whole of it when
 * adding, only what was changed when correcting (an address that is taken away is named in `clear`). A collaborator needs a logo: adding one without it is refused, and a logo can be
 * replaced but not taken away. Correcting with nothing changed says so, without asking the server.
 */
export default function CollaboratorForm({ collaborator = null, onSave, submitLabel }) {
  const editing = Boolean(collaborator)
  const initial = { kind: collaborator?.kind ?? '', name: collaborator?.name ?? '', url: collaborator?.url ?? '' }
  const form = useForm(initial)
  const [logo, setLogo] = useState(null)
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

  const preview = useMemo(() => (logo ? URL.createObjectURL(logo) : null), [logo])
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  const validate = (v) => {
    const found = {}
    if (!v.kind) found['coll-kind'] = 'Choose the wall the collaborator belongs to.'
    if (!v.name.trim()) found['coll-name'] = 'Enter the name.'
    else if (v.name.trim().length > 200) found['coll-name'] = 'The name must be at most 200 characters long.'
    if (v.url.trim() && !isWebAddress(v.url)) found['coll-url'] = 'The address must be a web address starting with http:// or https://.'
    if (!editing && !logo) found['coll-logo'] = "Choose the organisation's logo."
    if (logo) {
      if (!LOGO_TYPES.includes(logo.type)) found['coll-logo'] = 'The logo must be a JPEG, PNG or WebP image.'
      else if (logo.size > MAX_LOGO) found['coll-logo'] = 'The logo is larger than 5 MB.'
    }
    return found
  }

  const send = async (v) => {
    const data = new FormData()
    const clear = []
    for (const key of ['kind', 'name']) if (!editing || v[key].trim() !== initial[key]) data.append(key, v[key].trim())
    const url = v.url.trim()
    if (url !== initial.url) {
      if (url) data.append('url', url)
      else clear.push('url')
    }
    if (logo) data.append('logo', logo)
    clear.forEach((key) => data.append('clear', key))
    if (editing && [...data.keys()].length === 0) {
      setNothing(true)
      return
    }
    await onSave(data)
  }

  const fieldFor = (error) => {
    if (error.code === 'invalid_input' && FIELDS.includes(error.field)) return `coll-${error.field}`
    if (error.code === 'name_taken') return 'coll-name'
    if (error.code === 'logo_invalid' || error.code === 'logo_too_large') return 'coll-logo'
    return null
  }

  return (
    <form onSubmit={(event) => form.submit(event, { validate, send, fieldFor })} noValidate className="stack-lg">
      <ErrorSummary errors={form.errors} version={form.version} />
      {form.failure && (
        <Notice kind="error" focusOnShow>
          {form.failure}
        </Notice>
      )}
      {nothing && <Notice kind="info">Nothing was changed.</Notice>}
      <div className="form-grid form-grid-2">
        <SelectField id="coll-kind" label="Wall" required {...bind('kind')} error={form.errors['coll-kind']} hint="Universities, institutes and companies are on three walls.">
          <option value="">Choose a wall</option>
          {KINDS.map((kind) => (
            <option key={kind.value} value={kind.value}>
              {kind.label}
            </option>
          ))}
        </SelectField>
        <TextField id="coll-name" label="Name" required autoComplete="off" {...bind('name')} error={form.errors['coll-name']} />
        <div className="span-2">
          <TextField
            id="coll-url"
            label="Website"
            hint="Its own website, for example https://www.example.edu/en. Use a company's Italian or English site, not its bare domain. Leave it empty if there is none."
            type="url"
            inputMode="url"
            autoComplete="off"
            {...bind('url')}
            error={form.errors['coll-url']}
          />
        </div>
      </div>

      <fieldset>
        <legend>Logo</legend>
        <div className="stack">
          {editing && collaborator.logo_url && !logo && <img className="logo-current" src={collaborator.logo_url} alt={`Current logo of ${collaborator.name}`} />}
          {preview && <img className="logo-current" src={preview} alt="The logo you chose, as it will be used" />}
          <FileField
            id="coll-logo"
            label={editing && collaborator.logo_url ? 'Choose a new logo' : 'Choose a logo'}
            required={!editing}
            hint={`A JPEG, PNG or WebP image of up to 5 MB. A transparent background is best. It is made smaller and stripped of everything but the picture. Use the organisation's own logo.${
              editing && collaborator.logo_url ? ' Every collaborator has a logo: to change it, choose a new one.' : ''
            }`}
            accept={LOGO_TYPES.join(',')}
            onChange={(event) => {
              setLogo(event.target.files?.[0] ?? null)
              setNothing(false)
            }}
            error={form.errors['coll-logo']}
          />
        </div>
      </fieldset>

      <div>
        <Button type="submit" variant="primary" busy={form.busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
