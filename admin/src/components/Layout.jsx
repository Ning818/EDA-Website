import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

/** The frame of every page after the login: a skip link, the header with the navigation, and the main area. */
export default function Layout() {
  const { user, can, logout } = useAuth()
  const { pathname } = useLocation()

  // after a page change the focus goes to the new page's heading, so a screen reader reads where it is and a keyboard user starts at the top
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    document.querySelector('main h1')?.focus()
  }, [pathname])

  const forced = user.must_change_password
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header className="app-header">
        <div className="app-header-inner">
          <NavLink to="/" className="brand">
            EDA Group admin
          </NavLink>
          <nav aria-label="Main" style={{ display: 'contents' }}>
            <ul className="nav-list">
              {!forced && (
                <>
                  <li>
                    <NavLink to="/" end className="nav-link">
                      Home
                    </NavLink>
                  </li>
                  {(can('people_add') || can('people_edit') || can('people_delete')) && (
                    <li>
                      <NavLink to="/people" className="nav-link">
                        People
                      </NavLink>
                    </li>
                  )}
                  {can('accounts') && (
                    <li>
                      <NavLink to="/accounts" className="nav-link">
                        Accounts
                      </NavLink>
                    </li>
                  )}
                </>
              )}
            </ul>
          </nav>
          <div className="who">
            <span>
              Signed in as <strong>{user.name}</strong>
            </span>
            {!forced && (
              <NavLink to="/change-password" className="nav-link">
                Change password
              </NavLink>
            )}
            <button type="button" className="btn-link" onClick={logout}>
              Log out
            </button>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
    </>
  )
}
