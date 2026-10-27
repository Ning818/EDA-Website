import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, setUnauthorizedHandler } from '../api/client'
import { AuthContext } from './authContext'

// Who is logged in. `status`: 'loading' (asking), 'anonymous' (nobody), 'expired' (the login ended while the admin was open), 'ready' (a user), 'error' (the API cannot be reached).
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, error: null })

  const refresh = useCallback(async () => {
    try {
      const user = await api.get('/api/auth/me', { quiet401: true })
      setState({ status: 'ready', user, error: null })
      return user
    } catch (error) {
      if (error.status === 401) setState({ status: 'anonymous', user: null, error: null })
      else setState({ status: 'error', user: null, error })
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
    setUnauthorizedHandler(() => setState((now) => (now.status === 'ready' ? { status: 'expired', user: null, error: null } : now)))
    return () => setUnauthorizedHandler(null)
  }, [])

  const login = useCallback(async (email, password) => {
    const user = await api.post('/api/auth/login', { email, password }, { quiet401: true })
    setState({ status: 'ready', user, error: null })
    return user
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout')
    } finally {
      setState({ status: 'anonymous', user: null, error: null })
    }
  }, [])

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const user = await api.post('/api/auth/change-password', { current_password: currentPassword, new_password: newPassword })
    setState({ status: 'ready', user, error: null })
    return user
  }, [])

  const value = useMemo(() => {
    const grants = state.user?.grants ?? []
    return {
      ...state,
      refresh,
      login,
      logout,
      changePassword,
      // whether the user has a grant for this area (a theme grant, for one theme or every theme, counts as `theme`)
      can: (area) => grants.some((grant) => grant.area === area),
    }
  }, [state, refresh, login, logout, changePassword])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
