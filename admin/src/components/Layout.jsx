import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import ErrorBoundary from './ErrorBoundary'
import SessionWarning from './SessionWarning'

/** A link of the navigation. It marks the page it leads to as the current one, and also the pages that lie under it without having its address (a collaborator is on the Collaborations page). */
function NavItem({ to, also = [], end = false, children }) {
  const { pathname } = useLocation()
  const under = (base) => pathname === base || pathname.startsWith(`${base}/`)
  const active = end ? pathname === to : [to, ...also].some(under)
  return (
    <Link to={to} className="nav-link" aria-current={active ? 'page' : undefined}>
      {children}
    </Link>
  )
}

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
                    <NavItem to="/" end>
                      Home
                    </NavItem>
                  </li>
                  {can('accounts') && (
                    <li>
                      <NavItem to="/accounts">
                        Accounts
                      </NavItem>
                    </li>
                  )}
                  {(can('people_add') || can('people_edit') || can('people_delete')) && (
                    <li>
                      <NavItem to="/people">
                        People
                      </NavItem>
                    </li>
                  )}
                  {can('theme') && (
                    <li>
                      <NavItem to="/themes">
                        Themes
                      </NavItem>
                    </li>
                  )}
                  {can('projects') && (
                    <li>
                      <NavItem to="/projects">
                        Funded projects
                      </NavItem>
                    </li>
                  )}
                  {can('site') && (
                    <>
                      <li>
                        <NavItem to="/collaborations" also={['/collaborators', '/joint-projects']}>
                          Collaborations
                        </NavItem>
                      </li>
                      <li>
                        <NavItem to="/site">
                          Site text
                        </NavItem>
                      </li>
                    </>
                  )}
                  {(can('people_edit') || can('site') || can('projects') || can('theme')) && (
                    <li>
                      <NavItem to="/links">
                        Broken links
                      </NavItem>
                    </li>
                  )}
                  {can('system') && (
                    <>
                      <li>
                        <NavItem to="/requests">
                          Requests
                        </NavItem>
                      </li>
                      <li>
                        <NavItem to="/audit">
                          Activity log
                        </NavItem>
                      </li>
                      <li>
                        <NavItem to="/system">
                          System status
                        </NavItem>
                      </li>
                    </>
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
              <NavItem to="/change-password">
                Change password
              </NavItem>
            )}
            <button type="button" className="btn-link" onClick={logout}>
              Log out
            </button>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="app-main">
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
      {/* the link to the page where a request is written is not offered on that page itself, nor to the developer, who answers the requests */}
      {!forced && user.grants.length > 0 && !can('system') && pathname !== '/help' && (
        <footer className="app-footer">
          <Link to={`/help?from=${encodeURIComponent(pathname)}`}>I can&apos;t find what I need</Link>
        </footer>
      )}
      <SessionWarning />
    </>
  )
}
