import { PageHeading } from './ui'

/** The frame of the pages shown before a login (the login page): a skip link, the header with the name, and the main area. */
export default function AuthFrame({ title, children }) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header className="app-header">
        <div className="app-header-inner">
          <span className="brand">EDA Group admin</span>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <div className="page page-narrow">
          <PageHeading>{title}</PageHeading>
          {children}
        </div>
      </main>
    </>
  )
}
