import { useEffect, useState } from 'react'
import { getLastActivity } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { ConfirmDialog } from './ui'

// How long before the login ends the user is told. A form that is half filled is not lost: the warning is a dialog on top of the page, and every answer to it leaves the page as it is.
export const WARN_MS = 5 * 60 * 1000
const CHECK_MS = 5000

const clock = new Intl.DateTimeFormat('en-GB', { timeStyle: 'short' })

/**
 * Warns before the login ends. A login ends after a time without any request (every request, such as a save or a page opening, starts the time again), and, whatever the user does, at
 * a latest time. In the first case the dialog offers to stay logged in; in the second nothing can be extended, so it says when it ends and asks the user to save what they are doing.
 */
export default function SessionWarning() {
  const { session, keepAlive, logout } = useAuth()
  const [now, setNow] = useState(() => Date.now())
  const [dismissed, setDismissed] = useState(null)
  const [busy, setBusy] = useState(false)

  // the time is looked at every few seconds, and at once when the user comes back to the tab (a laptop that slept, a tab that was in the background)
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const timer = setInterval(tick, CHECK_MS)
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', tick)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])

  if (!session) return null
  const idleEnds = getLastActivity() + session.idleMs
  const limited = session.maxEndsAt <= idleEnds // nothing the user does can make the login last longer
  const ends = Math.min(idleEnds, session.maxEndsAt)
  const left = ends - now
  const open = left > 0 && left <= WARN_MS && dismissed !== ends

  async function stay() {
    setBusy(true)
    await keepAlive()
    setBusy(false)
  }

  if (limited) {
    return (
      <ConfirmDialog open={open} title="Your login is about to end" confirmLabel="Log out now" cancelLabel="Keep working" onConfirm={logout} onCancel={() => setDismissed(ends)}>
        <p>
          Your login ends at <strong>{clock.format(ends)}</strong>, and staying active will not make it last longer. Finish what you are doing and save it before then, then log in again.
        </p>
      </ConfirmDialog>
    )
  }
  return (
    <ConfirmDialog open={open} title="Your login is about to end" confirmLabel="Stay logged in" cancelLabel="Not now" onConfirm={stay} onCancel={() => setDismissed(ends)} busy={busy}>
      <p>
        Your login ends at <strong>{clock.format(ends)}</strong> because you have not done anything for a while. Choose <q>Stay logged in</q> to go on. What you have typed on this page is kept.
      </p>
    </ConfirmDialog>
  )
}
