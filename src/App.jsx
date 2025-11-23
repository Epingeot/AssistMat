import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AuthForm from './components/Auth/AuthForm'
import AssistanteDashboard from './pages/AssistanteDashboard'
import ParentDashboard from './pages/ParentDashboard'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Chargement...</div>
      </div>
    )
  }

  return user ? children : <Navigate to="/login" />
}

function AppRoutes() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl font-semibold text-gray-600">Chargement...</div>
      </div>
    )
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to="/" /> : <AuthForm />} 
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            {profile?.role === 'assistante' ? (
              <AssistanteDashboard />
            ) : (
              <ParentDashboard />
            )}
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}