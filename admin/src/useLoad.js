import { useCallback, useEffect, useState } from 'react'

/**
 * Loads something once when the page opens, and again on `reload()`: `{ status: 'loading' | 'ok' | 'error', data, error, reload }`. A request that is still on its way when the
 * page is left, or asked for again, is ignored.
 */
export function useLoad(load, deps = []) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let current = true
    setState((now) => (now.status === 'loading' ? now : { ...now, status: 'loading' }))
    load().then(
      (data) => current && setState({ status: 'ok', data, error: null }),
      (error) => current && setState({ status: 'error', data: null, error }),
    )
    return () => {
      current = false
    }
    // `load` is a new function on every render; the caller says what it depends on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, reload }
}
