import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'
import AssistanteProfile from '../components/Assistante/AssistanteProfile'
import ReservationsList from '../components/Assistante/ReservationsList'
import ErrorBoundary from '../components/ErrorBoundary'

export default function AssistanteDashboard() {
  const { profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('profil')

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-purple-600">AssistMat</h1>
            <p className="text-sm text-gray-600">Espace Assistante Maternelle</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">
              {profile?.prenom} {profile?.nom}
            </span>
            <button
              onClick={signOut}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-semibold"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </nav>

      {/* Contenu */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Onglets */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('profil')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'profil'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            👤 Mon profil
          </button>
          <button
            onClick={() => setActiveTab('reservations')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'reservations'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            📅 Réservations
          </button>
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'profil' && (
          <ErrorBoundary
            name="Assistante Profile Tab"
            title="Erreur de profil"
            message="Impossible de charger votre profil professionnel."
          >
            <AssistanteProfile />
          </ErrorBoundary>
        )}
        {activeTab === 'reservations' && (
          <ErrorBoundary
            name="Assistante Reservations Tab"
            title="Erreur de réservations"
            message="Impossible de charger les demandes de réservation."
          >
            <ReservationsList />
          </ErrorBoundary>
        )}
      </div>
    </div>
  )
}