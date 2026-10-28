import { useState } from 'react'
import { isWebAddress, useForm } from '../useForm'
import { Button, ErrorSummary, Notice, TextAreaField, TextField } from './ui'

const FIELDS = ['code', 'name', 'funding', 'years', 'coordinator', 'url', 'partners']

// one name to a line; empty lines do not count
const toNames = (text) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

/**
 * The form for a joint project of the Collaborations page, to add one (`project` empty) or to correct one. `onSave(body)` sends what the API takes (everything when adding, only what was
 * changed when correcting) and rejects with the API's refusal. Correcting with nothing changed says so, without asking the server.
 */
export default function JointProjectForm({ project = null, onSave, submitLabel }) {
  const editing = Boolean(project)
  const initial = {
    code: project?.code ?? '',
    name: project?.name ?? '',
    funding: project?.funding ?? '',
    years: project?.years ?? '',
    coordinator: project?.coordinator ?? '',
    url: project?.url ?? '',
    partners: (project?.partners ?? []).join('\n'),
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
    const required = [
      ['code', 'Enter the code.', 50, 'The code must be at most 50 characters long.'],
      ['name', 'Enter the name.', 300, 'The name must be at most 300 characters long.'],
      ['funding', 'Enter who funds the project.', 100, 'The funding must be at most 100 characters long.'],
      ['years', 'Enter the years.', 20, 'The years must be at most 20 characters long.'],
      ['coordinator', 'Enter who coordinated the project.', 200, 'The coordinator must be at most 200 characters long.'],
    ]
    for (const [key, empty, max, long] of required) {
      if (!v[key].trim()) found[`joint-${key}`] = empty
      else if (v[key].trim().length > max) found[`joint-${key}`] = long
    }
    if (!v.url.trim()) found['joint-url'] = "Enter the address of the project's record."
    else if (!isWebAddress(v.url)) found['joint-url'] = 'The address must be a web address starting with http:// or https://.'
    const names = toNames(v.partners)
    if (names.length > 40) found['joint-partners'] = 'There can be at most 40 partners.'
    else if (names.some((name) => name.length > 200)) found['joint-partners'] = 'A partner name must be at most 200 characters long.'
    return found
  }

  const send = async (v) => {
    const body = {}
    for (const key of ['code', 'name', 'funding', 'years', 'coordinator', 'url']) if (!editing || v[key].trim() !== initial[key]) body[key] = v[key].trim()
    const names = toNames(v.partners)
    if (!editing || names.join('\n') !== toNames(initial.partners).join('\n')) body.partners = names
    if (editing && !Object.keys(body).length) {
      setNothing(true)
      return
    }
    await onSave(body)
  }

  const fieldFor = (error) => {
    if (error.code === 'invalid_input' && FIELDS.includes(error.field)) return `joint-${error.field}`
    if (error.code === 'code_taken') return 'joint-code'
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
        <TextField id="joint-code" label="Code" required autoComplete="off" hint="The project's short name, as its record gives it. No other joint project has the same one." {...bind('code')} error={form.errors['joint-code']} />
        <TextField id="joint-years" label="Years" required autoComplete="off" hint="For example 2013–2016." {...bind('years')} error={form.errors['joint-years']} />
        <div className="span-2">
          <TextAreaField id="joint-name" label="Name" required rows={2} hint="The project's full name. Plain text, at most 300 characters." {...bind('name')} error={form.errors['joint-name']} />
        </div>
        <TextField id="joint-funding" label="Funding" required autoComplete="off" hint="Who funds it, for example EU FP7 or EU Horizon 2020." {...bind('funding')} error={form.errors['joint-funding']} />
        <TextField id="joint-coordinator" label="Coordinator" required autoComplete="off" {...bind('coordinator')} error={form.errors['joint-coordinator']} />
        <div className="span-2">
          <TextField
            id="joint-url"
            label="Record on CORDIS"
            required
            type="url"
            inputMode="url"
            autoComplete="off"
            hint="The address of the project's record, for example https://cordis.europa.eu/project/id/…"
            {...bind('url')}
            error={form.errors['joint-url']}
          />
        </div>
        <div className="span-2">
          <TextAreaField
            id="joint-partners"
            label="Other partners"
            rows={5}
            hint="One name to a line, as the project's record gives them. They need not be collaborators of the page. Leave it empty if there are none."
            {...bind('partners')}
            error={form.errors['joint-partners']}
          />
        </div>
      </div>
      <div>
        <Button type="submit" variant="primary" busy={form.busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
