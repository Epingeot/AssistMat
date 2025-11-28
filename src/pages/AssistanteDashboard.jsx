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
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-purple-600">AssistMat</h1>
            <p className="text-xs md:text-sm text-gray-600 hidden sm:block">Espace Assistante Maternelle</p>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <span className="text-sm md:text-base text-gray-700 hidden md:block">
              {profile?.prenom} {profile?.nom}
            </span>
            <button
              onClick={signOut}
              className="px-3 md:px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm md:text-base font-semibold active:bg-red-700"
            >
              <span className="hidden sm:inline">Déconnexion</span>
              <span className="sm:hidden">✕</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Contenu */}
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
        {/* Onglets */}
        <div className="grid grid-cols-2 gap-2 md:flex md:gap-4 mb-6">
          <button
            onClick={() => setActiveTab('profil')}
            className={`px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-semibold transition text-sm md:text-base ${
              activeTab === 'profil'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100'
            }`}
          >
            👤 Mon profil
          </button>
          <button
            onClick={() => setActiveTab('reservations')}
            className={`px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-semibold transition text-sm md:text-base ${
              activeTab === 'reservations'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100'
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