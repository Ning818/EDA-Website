import { Component } from 'react'
import { Link } from 'react-router-dom'
import { Notice } from './ui'

/**
 * What a page shows when something in it breaks while it is drawn: a message and a way out, instead of a blank screen (which tells a screen reader user nothing). It is made new for
 * every page (see Layout.jsx), so going to another page starts it again. The message is announced at once (role alert).
 */
export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    // what broke, for whoever looks at the browser's console
    console.error('The page could not be drawn:', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="page page-narrow">
        <Notice kind="error" title="Something went wrong on this page">
          <p>The page could not be shown. Reload it. If it happens again, tell the developer which page it was.</p>
          <p style={{ marginTop: '0.75rem' }}>
            <Link to="/">Back to the home page</Link>
          </p>
        </Notice>
      </div>
    )
  }
}
