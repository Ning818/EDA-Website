// The email addresses that have logged in on this computer, kept in the browser so that the login page can offer them when the email field is clicked. Only addresses are kept, never
// a password; only an address that logged in (not a mistyped one); the five latest. Storage can be blocked or full (a private window, site data turned off): then nothing is kept and
// the login works as before.

const KEY = 'eda-admin-emails'
export const MAX_SAVED = 5

/** The saved addresses, the latest first. */
export function savedEmails() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(list) ? list.filter((item) => typeof item === 'string' && item).slice(0, MAX_SAVED) : []
  } catch {
    return []
  }
}

/** Puts an address that has just logged in first in the list (once, in lower case), and returns the list. */
export function rememberEmail(email) {
  const address = String(email).trim().toLowerCase()
  if (!address) return savedEmails()
  const list = [address, ...savedEmails().filter((item) => item !== address)].slice(0, MAX_SAVED)
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // nowhere to keep it: the login goes on without
  }
  return list
}

/** Takes every saved address away. */
export function forgetEmails() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // nothing to take away
  }
}
