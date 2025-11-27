import React from 'react'
import { logger } from '../utils/logger'

/**
 * Error Boundary Component
 * Catches JavaScript errors in child components and displays fallback UI
 *
 * Usage:
 * <ErrorBoundary name="MyComponent" title="Error title" message="Error message">
 *   <MyComponent />
 * </ErrorBoundary>
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    logger.error('ErrorBoundary caught error:', {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      boundary: this.props.name || 'Unknown'
    })

    this.setState({
      error,
      errorInfo
    })

    // Optional: Send to error tracking service (Sentry, LogRocket, etc.)
    // if (import.meta.env.PROD) {
    //   sendToErrorTracking(error, errorInfo, this.props.name)
    // }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })

    // Call optional reset callback
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          errorInfo: this.state.errorInfo,
          resetError: this.resetError
        })
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            {/* Error Icon and Title */}
            <div className="flex items-center gap-3 mb-4">
              <div className="text-red-500 text-4xl">⚠️</div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {this.props.title || 'Une erreur est survenue'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {this.props.message || 'Quelque chose s\'est mal passé'}
                </p>
              </div>
            </div>

            {/* Error Details (dev mode only) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-4 text-xs">
                <summary className="cursor-pointer text-gray-600 hover:text-gray-900 font-medium">
                  Détails techniques (dev only)
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded overflow-auto text-red-600 max-h-48">
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={this.resetError}
                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
              >
                Réessayer
              </button>
              {this.props.showHomeButton && (
                <button
                  onClick={() => window.location.href = '/'}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition"
                >
                  Retour accueil
                </button>
              )}
            </div>
          </div>
        </div>
      )
    }

    // No error, render children normally
    return this.props.children
  }
}

export default ErrorBoundary
