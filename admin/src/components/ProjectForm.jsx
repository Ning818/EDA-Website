import { useState } from 'react'
import { LANGUAGES, PROJECT_STATUSES } from '../labels'
import { isWebAddress, useForm } from '../useForm'
import { Button, ErrorSummary, Notice, SelectField, TextAreaField, TextField } from './ui'

const FIELDS = ['theme', 'status', 'code', 'description', 'language', 'url']

/**
 * The form for a funded project, to add one (`project` empty) or to correct one. `themes` are the themes to choose from, as the API gives them. `onSave(body)` sends what the API takes
 * (everything when adding, only what was changed when correcting) and rejects with the API's refusal. Correcting with nothing changed says so, without asking the server.
 */
export default function ProjectForm({ project = null, themes, onSave, submitLabel }) {
  const editing = Boolean(project)
  const initial = {
    theme: project?.theme_slug ?? '',
    status: project?.status ?? 'ongoing',
    code: project?.code ?? '',
    description: project?.description ?? '',
    language: project?.language ?? '',
    url: project?.url ?? '',
  }
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
    if (!v.theme) found['proj-theme'] = 'Choose the theme the project belongs to.'
    if (!v.description.trim()) found['proj-description'] = 'Enter the description.'
    else if (v.description.trim().length > 300) found['proj-description'] = 'The description must be at most 300 characters long.'
    if (v.code.trim().length > 50) found['proj-code'] = 'The code must be at most 50 characters long.'
    if (v.url.trim() && !isWebAddress(v.url)) found['proj-url'] = 'The address must be a web address starting with http:// or https://.'
    return found
  }

  // adding sends everything that was filled in; correcting sends what differs from what was there, and an emptied code or address as null (which removes it)
  const body = (v) => {
    const send = {}
    for (const key of ['theme', 'status', 'description']) if (!editing || v[key].trim() !== initial[key]) send[key] = v[key].trim()
    // English is no language: it is sent as null, which is also what takes a language away
    if (editing ? v.language !== initial.language : v.language) send.language = v.language || null
    for (const key of ['code', 'url']) {
      const value = v[key].trim()
      if (editing ? value !== initial[key] : value) send[key] = value || null
    }
    return send
  }

  const send = async (v) => {
    const changes = body(v)
    if (editing && !Object.keys(changes).length) {
      setNothing(true)
      return
    }
    await onSave(changes)
  }

  const fieldFor = (error) => (error.code === 'invalid_input' && FIELDS.includes(error.field) ? `proj-${error.field}` : null)

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
        <SelectField id="proj-theme" label="Theme" required {...bind('theme')} error={form.errors['proj-theme']}>
          <option value="">Choose a theme</option>
          {themes.map((theme) => (
            <option key={theme.slug} value={theme.slug}>
              {theme.name}
            </option>
          ))}
        </SelectField>
        <SelectField id="proj-status" label="Status" required {...bind('status')} error={form.errors['proj-status']}>
          {PROJECT_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </SelectField>
        <TextField
          id="proj-code"
          label="Code"
          hint="The project's short name, for example R2POWER300. Leave it empty if the project has none."
          autoComplete="off"
          {...bind('code')}
          error={form.errors['proj-code']}
        />
        <TextField
          id="proj-url"
          label="Project website"
          hint="A web address, for example https://www.example.eu/… Leave it empty where the project has no working site."
          type="url"
          inputMode="url"
          autoComplete="off"
          {...bind('url')}
          error={form.errors['proj-url']}
        />
        <div className="span-2">
          <TextAreaField
            id="proj-description"
            label="Description"
            hint="The project's full name, as the funder writes it. Plain text, at most 300 characters."
            rows={3}
            required
            {...bind('description')}
            error={form.errors['proj-description']}
          />
        </div>
        <SelectField
          id="proj-language"
          label="Language of the description"
          hint="Choose a language if the description is not in English. A screen reader then reads it in that language."
          {...bind('language')}
          error={form.errors['proj-language']}
        >
          {LANGUAGES.map((language) => (
            <option key={language.value} value={language.value}>
              {language.label}
            </option>
          ))}
        </SelectField>
      </div>
      <div>
        <Button type="submit" variant="primary" busy={form.busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
