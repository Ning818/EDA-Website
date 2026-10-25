import { useEffect, useState } from 'react'
import { useApi } from './useApi'

const readKept = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key))
  } catch {
    return null
  }
}

/**
 * For what every page shows and must never wait for (the nav bar's theme names, the footer): the API's answer for `path` once it is in; until then - and if it never comes -
 * the last answer, which the browser kept under `key` (where it is allowed), or null the first time. The caller falls back to the defaults written in the code.
 */
export function useKeptApi(path, key) {
  const { status, data } = useApi(path)
  const [kept] = useState(() => readKept(key))

  useEffect(() => {
    if (status !== 'ok') return
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch {
      /* the answer is not kept */
    }
  }, [status, data, key])

  return status === 'ok' ? data : kept
}
