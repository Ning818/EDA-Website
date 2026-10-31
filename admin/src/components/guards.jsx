import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { LinkButton, Loading, LoadError, PageHeading } from './ui'

/** Everything except the login page needs a login; a user still on a temporary password is sent to change it first. */
export function RequireAuth() {
  const auth = useAuth()
  const location = useLocation()
  if (auth.status === 'loading') {
    return (
      <main className="page">
        <Loading>Checking your login…</Loading>
      </main>
    )
  }
  if (auth.status === 'error') {
    return (
      <main className="page">
        <LoadError error={auth.error} onRetry={auth.refresh} />
      </main>
    )
  }
  // where to go back to after the login: nowhere after the user chose to log out, and only for the same person when the login ended by itself
  if (auth.status !== 'ready') return <Navigate to="/login" replace state={{ from: auth.loggedOut ? null : location, expired: auth.status === 'expired', userId: auth.lastUserId }} />
  if (auth.user.must_change_password && location.pathname !== '/change-password') return <Navigate to="/change-password" replace />
  return <Outlet />
}

/** A page for those who have at least one of these grants; anyone else is told so (the navigation does not offer it to them either). */
export function RequireGrant({ areas, children }) {
  const { can } = useAuth()
  if (!areas.some(can)) {
    return (
      <div className="page page-narrow">
        <PageHeading>You do not have access to this page</PageHeading>
        <p>Your account is not allowed to use this part of the admin. If you think it should be, ask the administrative staff.</p>
        <LinkButton to="/">Back to the home page</LinkButton>
      </div>
    )
  }
  return children
}
