import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import AuthForm from './components/Auth/AuthForm'
import AssistanteDashboard from './pages/AssistanteDashboard'
import ParentDashboard from './pages/ParentDashboard'
import LandingPage from './pages/LandingPage'
import PublicSearchPage from './pages/PublicSearchPage'
import Disclaimer from './pages/Disclaimer'
import { logger } from './utils/logger'
import ErrorBoundary from './components/ErrorBoundary'
import UpdateNotification from './components/UpdateNotification'
import { Toaster } from 'react-hot-toast'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl font-semibold text-gray-600">Chargement...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

function AppRoutes() {
  const { user, profile, loading } = useAuth()

  logger.log('🚦 AppRoutes:', {
    user: user?.email,
    role: profile?.role,
    loading
  })

  // 🧪 TEST: Uncomment to simulate router error (caught by root Error Boundary)
  // throw new Error('TEST: Simulated router/app error')

  if (loading) {
    logger.log('🚦 AppRoutes: Showing loading screen')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl font-semibold text-gray-600">Chargement...</div>
      </div>
    )
  }
  logger.log('🚦 AppRoutes: Rendering routes')

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/search" element={<PublicSearchPage />} />
      <Route
        path="/login"
        element={
          user ? (
            <>
              {logger.log('🚦 Login route: User exists, redirecting to /dashboard')}
              <Navigate to="/dashboard" replace />
            </>
          ) : (
            <>
              {logger.log('🚦 Login route: No user, showing AuthForm')}
              <AuthForm />
            </>
          )
        }
      />
      <Route path="/disclaimer" element={<Disclaimer />} />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            {logger.log('🚦 Dashboard route: Showing dashboard for role:', profile?.role)}
            {profile?.role === 'assistante' ? (
              <AssistanteDashboard />
            ) : (
              <ParentDashboard />
            )}
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary
      name="App Root"
      title="Erreur Critique"
      message="L'application a rencontré une erreur inattendue. Veuillez réessayer."
      showHomeButton
    >
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <AppRoutes />
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#333',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            borderRadius: '8px',
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <UpdateNotification />
    </ErrorBoundary>
  )
}