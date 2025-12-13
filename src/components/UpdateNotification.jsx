import { useState, useEffect } from 'react'

/**
 * UpdateNotification Component
 *
 * Displays a banner when a new version of the app is available.
 * The banner prompts users to refresh to get the latest version.
 *
 * How it works:
 * - Listens for the 'sw-update-available' custom event dispatched by main.jsx
 * - When triggered, shows a fixed banner at the bottom of the screen
 * - When user clicks "Actualiser", it sends a message to the waiting service worker
 *   to skip waiting, then reloads the page
 */
export default function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState(null)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    // Listen for the custom event from main.jsx when SW update is detected
    const handleSwUpdate = (event) => {
      console.log('[UpdateNotification] Update available event received')
      setWaitingWorker(event.detail.waitingWorker)
      setShowUpdate(true)
    }

    window.addEventListener('sw-update-available', handleSwUpdate)

    return () => {
      window.removeEventListener('sw-update-available', handleSwUpdate)
    }
  }, [])

  const handleUpdate = () => {
    if (!waitingWorker) {
      // Fallback: just reload if no waiting worker reference
      window.location.reload()
      return
    }

    setIsUpdating(true)

    // Tell the waiting service worker to skip waiting and become active
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })

    // Listen for the new service worker to take control
    // When it does, reload the page to get fresh content
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })
  }

  const handleDismiss = () => {
    setShowUpdate(false)
  }

  if (!showUpdate) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-violet-600 text-white shadow-lg">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Refresh icon */}
          <svg
            className="w-6 h-6 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <div>
            <p className="font-semibold">Nouvelle version disponible</p>
            <p className="text-sm text-violet-200">
              Cliquez sur "Actualiser" pour obtenir les dernières mises à jour
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-sm text-violet-200 hover:text-white transition-colors"
            disabled={isUpdating}
          >
            Plus tard
          </button>
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="px-4 py-2 bg-white text-violet-600 rounded-lg font-medium hover:bg-violet-50 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isUpdating ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Mise à jour...
              </>
            ) : (
              'Actualiser'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
