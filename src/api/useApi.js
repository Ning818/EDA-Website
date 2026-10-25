import { useEffect, useState } from 'react'
import { getJSON } from './client'

/**
 * Loads a route of the API when the component appears (and again when `path` changes). Returns `{ status, data, error, retry }`: `status` is 'loading' until the
 * answer is in, then 'ok' (`data` is the JSON) or 'error' (`error` is an Error whose message can be shown); `retry()` asks again after an error.
 * "Loading" is not stored, it is what it is while the answer on hand is not for this path and this attempt - so a new path never shows the old path's data.
 */
export function useApi(path) {
  const [attempt, setAttempt] = useState(0)
  const [answer, setAnswer] = useState({ path: null, attempt: -1, data: null, error: null })

  useEffect(() => {
    const controller = new AbortController()
    getJSON(path, { signal: controller.signal })
      .then((data) => setAnswer({ path, attempt, data, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError') setAnswer({ path, attempt, data: null, error })
      })
    return () => controller.abort()
  }, [path, attempt])

  const settled = answer.path === path && answer.attempt === attempt
  return {
    status: !settled ? 'loading' : answer.error ? 'error' : 'ok',
    data: settled ? answer.data : null,
    error: settled ? answer.error : null,
    retry: () => setAttempt((n) => n + 1),
  }
}
