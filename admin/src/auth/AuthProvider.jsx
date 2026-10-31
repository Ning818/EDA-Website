import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, setUnauthorizedHandler } from '../api/client'
import { AuthContext } from './authContext'

// How long a login lasts, from what the API said when it answered: it ends after `idleMs` without a request, and at `maxEndsAt` whatever the user does.
const sessionOf = (user) => (user.session ? { idleMs: user.session.idle_seconds * 1000, maxEndsAt: Date.now() + user.session.max_seconds_left * 1000 } : null)

// Who is logged in. `status`: 'loading' (asking), 'anonymous' (nobody), 'expired' (the login ended while the admin was open), 'ready' (a user), 'error' (the API cannot be reached).
// `loggedOut`: the user chose to log out, so whoever logs in next starts at the home page, not at the page the last one was on. `lastUserId`: whose login ended (`expired`), so that only
// the same person is taken back to the page they were on.
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, session: null, error: null, loggedOut: false, lastUserId: null })

  const refresh = useCallback(async () => {
    try {
      const user = await api.get('/api/auth/me', { quiet401: true })
      setState({ status: 'ready', user, session: sessionOf(user), error: null, loggedOut: false, lastUserId: null })
      return user
    } catch (error) {
      if (error.status === 401) setState({ status: 'anonymous', user: null, session: null, error: null, loggedOut: false, lastUserId: null })
      else setState({ status: 'error', user: null, session: null, error, loggedOut: false, lastUserId: null })
      return null
    }
  }, [])

  useEffect(() => {
    // asks who is logged in once, when the admin opens: the state is set when the answer arrives, not during this effect
    // oxlint-disable-next-line react/set-state-in-effect
    refresh()
  }, [refresh])

  // a request that needs a login and is refused: the login has ended
  useEffect(() => {
    setUnauthorizedHandler(() => setState((now) => (now.status === 'ready' ? { status: 'expired', user: null, session: null, error: null, loggedOut: false, lastUserId: now.user?.id ?? null } : now)))
    return () => setUnauthorizedHandler(null)
  }, [])

  const login = useCallback(async (email, password) => {
    const user = await api.post('/api/auth/login', { email, password }, { quiet401: true })
    setState({ status: 'ready', user, session: sessionOf(user), error: null, loggedOut: false, lastUserId: null })
    return user
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout')
    } finally {
      setState({ status: 'anonymous', user: null, session: null, error: null, loggedOut: true, lastUserId: null })
    }
  }, [])

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const user = await api.post('/api/auth/change-password', { current_password: currentPassword, new_password: newPassword })
    setState({ status: 'ready', user, session: sessionOf(user), error: null, loggedOut: false, lastUserId: null })
    return user
  }, [])

  const value = useMemo(() => {
    const grants = state.user?.grants ?? []
    return {
      ...state,
      refresh,
      // asking who is logged in also starts the idle time again: it is how the warning before the login ends lets the user stay
      keepAlive: refresh,
      login,
      logout,
      changePassword,
      // whether the user has a grant for this area (a theme grant, for one theme or every theme, counts as `theme`)
      can: (area) => grants.some((grant) => grant.area === area),
    }
  }, [state, refresh, login, logout, changePassword])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
