import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'  // ← Cette ligne DOIT être présente !

/**
 * Service Worker Registration with Update Detection
 *
 * This code registers the service worker and monitors for updates.
 * When a new version is available:
 * 1. The new SW installs in the background
 * 2. It enters "waiting" state (doesn't activate yet)
 * 3. We dispatch a custom event to notify the UI
 * 4. The UpdateNotification component shows a banner
 * 5. When user clicks "Refresh", we tell the SW to skip waiting
 * 6. The new SW activates and we reload the page
 */
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('✅ SW registered:', registration.scope);

        // Check if there's already a waiting service worker
        // (This happens if user previously dismissed the update notification)
        if (registration.waiting) {
          console.log('🔄 SW update already waiting');
          notifyUpdateAvailable(registration.waiting);
        }

        // Listen for new service worker installing
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🔄 SW update found, installing...');

          // Wait for the new service worker to finish installing
          newWorker.addEventListener('statechange', () => {
            console.log('🔄 SW state changed to:', newWorker.state);

            // "installed" means the new SW is ready but waiting
            // We only show the notification if there's an existing controller
            // (meaning this is an update, not a first-time install)
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 New SW installed and waiting, notifying user');
              notifyUpdateAvailable(newWorker);
            }
          });
        });
      })
      .catch(error => {
        console.log('❌ SW registration failed:', error);
      });

    // Periodically check for updates (every 60 seconds)
    // This ensures users get notified even if they keep the app open for a long time
    setInterval(() => {
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration) {
          registration.update().catch(err => {
            console.log('SW update check failed:', err);
          });
        }
      });
    }, 60 * 1000);
  });
}

/**
 * Dispatch a custom event to notify the app that an update is available.
 * The UpdateNotification component listens for this event.
 */
function notifyUpdateAvailable(waitingWorker) {
  window.dispatchEvent(
    new CustomEvent('sw-update-available', {
      detail: { waitingWorker }
    })
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)