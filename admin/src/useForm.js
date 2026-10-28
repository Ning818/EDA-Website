import { useState } from 'react'

/**
 * What every form of the admin has: the values, the errors tied to their fields, a failure that belongs to no field, whether a request is on its way, and `version`, which changes with
 * every failed submit so that the error summary takes the focus. `submit` checks the values (`validate` gives `{ fieldId: message }`), sends them (`send`, which rejects with the API's
 * refusal), and puts a refusal at the field `fieldFor(error)` names, or shows it as a message of its own. It says whether the values were sent.
 */
export function useForm(initial) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState({})
  const [failure, setFailure] = useState(null)
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(false)

  const set = (key, value) => setValues((now) => ({ ...now, [key]: value }))
  const bind = (key) => ({ value: values[key], onChange: (event) => set(key, event.target.value) })

  async function submit(event, { validate, send, fieldFor }) {
    event?.preventDefault()
    if (busy) return false
    setFailure(null)
    const found = validate?.(values) ?? {}
    setErrors(found)
    if (Object.keys(found).length) {
      setVersion((n) => n + 1)
      return false
    }
    setBusy(true)
    try {
      await send(values)
      setBusy(false)
      return true
    } catch (error) {
      setBusy(false)
      const id = fieldFor?.(error)
      if (id) {
        setErrors({ [id]: error.message })
        setVersion((n) => n + 1)
      } else {
        setFailure(error.message)
      }
      return false
    }
  }

  return { values, set, bind, errors, failure, version, busy, submit }
}

export const isWebAddress = (value) => /^https?:\/\/\S+$/i.test(value.trim())
