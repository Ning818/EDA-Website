import { useCallback } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'

/**
 * A value that lives in the address (`/people?q=sara`) instead of only in the page: reloading the page, going back to it and sending its link all bring it back. Typing changes the
 * address in place (no new history entry for each key), and a message that the page before sent along with the navigation is kept. An empty value is no parameter at all.
 */
export function useQueryParam(name) {
  const [params, setParams] = useSearchParams()
  const { state } = useLocation()
  const set = useCallback(
    (value) =>
      setParams(
        (now) => {
          const next = new URLSearchParams(now)
          if (value) next.set(name, value)
          else next.delete(name)
          return next
        },
        { replace: true, state },
      ),
    [name, setParams, state],
  )
  return [params.get(name) ?? '', set]
}
