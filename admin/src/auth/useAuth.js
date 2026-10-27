import { useContext } from 'react'
import { AuthContext } from './authContext'

/** `{ status, user, error, can(area), login, logout, changePassword, refresh }`; see AuthProvider.jsx. */
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth needs an AuthProvider')
  return value
}
