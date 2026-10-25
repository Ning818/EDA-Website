// Talking to the API (backend/). The address is the page's own by default: the dev server (vite.config.js) and the production host forward /api and /media to
// the backend, so a phone on the Wi-Fi needs nothing but the page's address. VITE_API_URL points the site at an API somewhere else.
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

/** The full address of a path the API gave (an /api/... route or a /media/... file); null where there is none. */
export const apiUrl = (path) => (path ? `${API_BASE}${path}` : null)

const TIMEOUT_MS = 10000

/**
 * GET a route of the API as JSON. It fails with an Error whose message can be shown: the server's status, "took too long" after TIMEOUT_MS (a backend that is
 * switched off or stuck must not leave the page loading for ever), or the browser's own message when there is no connection. `signal` cancels it
 * (the caller leaving the page); that rejects with the AbortError itself.
 */
export async function getJSON(path, { signal } = {}) {
  const controller = new AbortController()
  const cancel = () => controller.abort()
  signal?.addEventListener('abort', cancel)
  const timer = setTimeout(cancel, TIMEOUT_MS)
  try {
    const response = await fetch(apiUrl(path), { signal: controller.signal, headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`The server answered ${response.status}`)
    return await response.json()
  } catch (error) {
    if (error.name === 'AbortError' && !signal?.aborted) throw new Error('The server took too long to answer')
    throw error
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', cancel)
  }
}
