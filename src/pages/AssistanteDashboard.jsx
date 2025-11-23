import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'
import AssistanteProfile from '../components/Assistante/AssistanteProfile'
import ReservationsList from '../components/Assistante/ReservationsList'

export default function AssistanteDashboard() {
  const { profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('profil') // 'profil' ou 'reservations'

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {/* Header */}
      <nav className="bg-white shadow-sm">
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
          {activeTab === 'profil' && <AssistanteProfile />}
          {activeTab === 'reservations' && <ReservationsList />}
        </div>
      </nav>

    </div>
  )
}
