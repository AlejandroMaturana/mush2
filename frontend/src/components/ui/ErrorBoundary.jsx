import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-6">
          <span className="material-symbols-outlined text-64px text-error mb-4">error_outline</span>
          <h2 className="text-headline-md text-error mb-2">FATAL_EXCEPTION</h2>
          <p className="text-body-md text-on-surface-variant max-w-md mb-6">{this.state.error?.message || 'Unhandled error in render cycle'}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="btn btn-danger"
          >
            REBOOT_SYSTEM
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
