import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LINK_FIELDS, TITLES } from '../labels'
import { Button, CheckboxField, ConfirmDialog, ErrorSummary, FileField, Notice, SelectField, TextField } from './ui'

const MAX_PHOTO = 5 * 1024 * 1024
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const isWebAddress = (value) => /^https?:\/\/\S+$/i.test(value.trim())

/**
 * The form for a person, to add one (`person` empty) or to correct one. `onSave(formData)` sends it and rejects with the API's refusal. A name that is in the list already comes back
 * as a warning with the people it matches, and the person is added once the user confirms they are someone else. Only what was changed is sent when correcting. A member leaves by the
 * title being changed to Former member: when that takes the person out of the contacts of some themes the API asks first, and the dialog here shows which, before it is sent again.
 */
export default function PersonForm({ person = null, onSave, submitLabel }) {
  const editing = Boolean(person)
  const initial = useMemo(
    () => ({
      name: person?.name ?? '',
      card_name: person && person.card_name !== person.name ? person.card_name : '',
      title: person?.title ?? '',
      ...Object.fromEntries(LINK_FIELDS.map(({ key }) => [key, person?.links?.[key] ?? ''])),
    }),
    [person],
  )
  const [values, setValues] = useState(initial)
  const [photo, setPhoto] = useState(null)
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState({})
  const [failure, setFailure] = useState(null)
  const [duplicates, setDuplicates] = useState(null)
  const [leaving, setLeaving] = useState(null) // the themes that lose the person as a contact, while the user is asked
  const [nothing, setNothing] = useState(false)
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(false)

  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo])
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  const set = (key) => (event) => {
    setValues((now) => ({ ...now, [key]: event.target.value }))
    setNothing(false)
  }

  function validate() {
    const found = {}
    if (!values.name.trim()) found['person-name'] = 'Enter the name.'
    if (!values.title) found['person-title'] = 'Choose a title.'
    for (const { key, label } of LINK_FIELDS) {
      if (values[key].trim() && !isWebAddress(values[key])) found[`person-${key}`] = `The ${label} link must be a web address starting with http:// or https://.`
    }
    if (photo) {
      if (!PHOTO_TYPES.includes(photo.type)) found['person-photo'] = 'The photo must be a JPEG, PNG or WebP image.'
      else if (photo.size > MAX_PHOTO) found['person-photo'] = 'The photo is larger than 5 MB.'
      if (!consent) found['person-consent'] = 'Confirm that the person agreed to the photo being used.'
    }
    return found
  }

  function build(confirmDistinct, confirmLeave) {
    const form = new FormData()
    const clear = []
    const send = (key, value) => form.append(key, value.trim())
    if (!editing) {
      send('name', values.name)
      send('title', values.title)
      if (values.card_name.trim()) send('card_name', values.card_name)
      for (const { key } of LINK_FIELDS) if (values[key].trim()) send(key, values[key])
      if (confirmDistinct) form.append('confirm_distinct', 'true')
    } else {
      for (const key of ['name', 'title']) if (values[key].trim() !== initial[key]) send(key, values[key])
      if (values.card_name.trim() !== initial.card_name) {
        if (values.card_name.trim()) send('card_name', values.card_name)
        else clear.push('card_name')
      }
      for (const { key } of LINK_FIELDS) {
        if (values[key].trim() === initial[key]) continue
        if (values[key].trim()) send(key, values[key])
        else clear.push(key)
      }
      clear.forEach((key) => form.append('clear', key))
      if (confirmLeave) form.append('confirm_leave', 'true')
    }
    if (photo) {
      form.append('photo', photo)
      form.append('photo_consent', 'true')
    }
    return { form, empty: editing && [...form.keys()].length === 0 }
  }

  function show(error) {
    setBusy(false)
    setLeaving(null)
    if (error.code === 'leave_needs_confirmation') {
      setLeaving(error.detail.affected ?? [])
      return
    }
    if (error.code === 'possible_duplicate') {
      setDuplicates(error.detail.matches ?? [])
      return
    }
    if (error.code === 'invalid_input' && error.field) setErrors({ [`person-${error.field}`]: error.message })
    else if (error.code === 'photo_invalid' || error.code === 'photo_too_large') setErrors({ 'person-photo': error.message })
    else if (error.code === 'photo_consent_required') setErrors({ 'person-consent': error.message })
    else {
      setFailure(error.message)
      return
    }
    setVersion((n) => n + 1)
  }

  async function submit(event, confirmDistinct = false, confirmLeave = false) {
    event?.preventDefault()
    if (busy) return
    setFailure(null)
    setDuplicates(null)
    setNothing(false)
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length) {
      setVersion((n) => n + 1)
      return
    }
    const { form, empty } = build(confirmDistinct, confirmLeave)
    if (empty) {
      setNothing(true)
      return
    }
    setBusy(true)
    try {
      await onSave(form)
    } catch (error) {
      show(error)
    }
  }

  return (
    <>
      <form onSubmit={submit} noValidate className="stack-lg">
        <ErrorSummary errors={errors} version={version} />
        {failure && (
          <Notice kind="error" focusOnShow>
            {failure}
          </Notice>
        )}
        {nothing && <Notice kind="info">Nothing was changed.</Notice>}
        {duplicates && (
          <Notice kind="warn" title="Someone with this name is in the list already" focusOnShow>
            <ul>
              {duplicates.map((match) => (
                <li key={match.slug}>
                  <Link to={`/people/${match.slug}`}>
                    {match.name}, {match.title}
                  </Link>
                </li>
              ))}
            </ul>
            <p style={{ margin: '0.75rem 0' }}>If this is a different person with the same name, you can add them anyway.</p>
            <Button onClick={() => submit(null, true)} busy={busy}>
              This is a different person: add anyway
            </Button>
          </Notice>
        )}

        <div className="form-grid form-grid-2">
          <TextField id="person-name" label="Full name" required value={values.name} onChange={set('name')} error={errors['person-name']} autoComplete="off" />
          <SelectField
            id="person-title"
            label="Title"
            hint={editing ? 'Choose Former member when the person has left the group.' : undefined}
            required
            value={values.title}
            onChange={set('title')}
            error={errors['person-title']}
          >
            <option value="">Choose a title</option>
            {TITLES.map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
          </SelectField>
          <div className="span-2">
            <TextField
              id="person-card_name"
              label="Name on the small cards"
              hint="Only if it is written differently there, for example with a middle name shortened to its initial. Leave it empty to use the full name."
              value={values.card_name}
              onChange={set('card_name')}
              error={errors['person-card_name']}
              autoComplete="off"
            />
          </div>
        </div>

        <fieldset>
          <legend>Pages elsewhere (optional)</legend>
          <div className="form-grid form-grid-2">
            {LINK_FIELDS.map(({ key, label, example }) => (
              <TextField
                key={key}
                id={`person-${key}`}
                label={`${label} link`}
                hint={`A web address, for example ${example}`}
                type="url"
                inputMode="url"
                value={values[key]}
                onChange={set(key)}
                error={errors[`person-${key}`]}
                autoComplete="off"
              />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Photo (optional)</legend>
          <div className="stack">
            {editing && person.photo_url && !photo && <img className="person-photo" src={person.photo_url} alt={`Current photo of ${person.name}`} />}
            {preview && <img className="person-photo" src={preview} alt="The photo you chose, as it will be used" />}
            <FileField
              id="person-photo"
              label={editing && person.photo_url ? 'Choose a new photo' : 'Choose a photo'}
              hint="A JPEG, PNG or WebP image of up to 5 MB. It is made smaller and stripped of the data a camera adds, such as where it was taken."
              accept={PHOTO_TYPES.join(',')}
              onChange={(event) => {
                setPhoto(event.target.files?.[0] ?? null)
                setConsent(false)
              }}
              error={errors['person-photo']}
            />
            {photo && (
              <CheckboxField
                id="person-consent"
                label="I confirm that this person agreed to this photo being used on the website."
                required
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                error={errors['person-consent']}
              />
            )}
          </div>
        </fieldset>

        <div>
          <Button type="submit" variant="primary" busy={busy}>
            {submitLabel}
          </Button>
        </div>
      </form>

      {editing && (
        <ConfirmDialog
          open={leaving !== null}
          title={`Let ${person.name} leave?`}
          confirmLabel="Make a Former member"
          danger
          busy={busy}
          onConfirm={() => submit(null, false, true)}
          onCancel={() => setLeaving(null)}
        >
          <p>{person.name} is a contact ("Refer to") of these themes and will be taken out of them:</p>
          <ul>
            {(leaving ?? []).map((theme) => (
              <li key={theme.theme_slug}>
                {theme.theme_name}:{' '}
                {theme.contacts_left === 0 ? 'no contact will be left, so the "Refer to" section of that page disappears.' : `${theme.contacts_left} ${theme.contacts_left === 1 ? 'contact is' : 'contacts are'} left.`}
              </li>
            ))}
          </ul>
          <p className="muted">They stay in the People list and in the research topics they are listed under. Nothing is deleted, and a user who can change people can set their title back.</p>
        </ConfirmDialog>
      )}
    </>
  )
}
