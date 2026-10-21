import { Component } from 'react'

/**
 * Keeps a failing particle canvas from taking the whole page with it: an error thrown while the canvas loads or renders (a model file that
 * does not load, no WebGL) is caught here, `onError` is told, and the canvas is simply left out. Without a boundary React unmounts the whole
 * tree on such an error - header, footer and all.
 */
export default class CanvasBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error('Particle canvas failed, showing the still pictures instead:', error)
    this.props.onError?.(error)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
