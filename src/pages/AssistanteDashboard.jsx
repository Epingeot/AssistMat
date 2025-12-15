import { useAuth } from '../contexts/AuthContext'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import AssistanteProfile from '../components/Assistante/AssistanteProfile'
import ReservationsList from '../components/Assistante/ReservationsList'
import AvailabilityCalendar from '../components/Calendar/AvailabilityCalendar'
import ErrorBoundary from '../components/ErrorBoundary'

export default function AssistanteDashboard() {
  const { user, profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState(null) // null until we determine the default
  const [assistanteId, setAssistanteId] = useState(null)
  const [profileComplete, setProfileComplete] = useState(false)

  // Load assistante data and determine default tab
  useEffect(() => {
    if (user) {
      checkProfileAndSetTab()
    }
  }, [user])

  const checkProfileAndSetTab = async () => {
    // Get assistante profile with required fields
    const { data: assistante } = await supabase
      .from('assistantes_maternelles')
      .select('id, adresse, ville, max_kids')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!assistante) {
      setActiveTab('profil')
      return
    }

    setAssistanteId(assistante.id)

    // Check required fields
    const hasRequiredFields = assistante.adresse && assistante.ville && assistante.max_kids

    if (!hasRequiredFields) {
      setActiveTab('profil')
      return
    }

    // Check if working hours are defined
    const { data: horaires } = await supabase
      .from('horaires_travail')
      .select('id')
      .eq('assistante_id', assistante.id)
      .limit(1)

    if (!horaires || horaires.length === 0) {
      setActiveTab('profil')
      return
    }

    // Profile is complete - default to planning tab
    setProfileComplete(true)
    setActiveTab('planning')
  }

  // Show loading while determining default tab
  if (activeTab === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Chargement...</div>
      </div>
    )
  }

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
        <div className="grid grid-cols-3 gap-2 md:flex md:gap-4 mb-6">
          <button
            onClick={() => setActiveTab('profil')}
            className={`px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-semibold transition text-sm md:text-base ${
              activeTab === 'profil'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100'
            }`}
          >
            👤 <span className="hidden sm:inline">Mon </span>Profil
          </button>
          <button
            onClick={() => setActiveTab('planning')}
            className={`px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-semibold transition text-sm md:text-base ${
              activeTab === 'planning'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100'
            }`}
          >
            📆 Planning
          </button>
          <button
            onClick={() => setActiveTab('reservations')}
            className={`px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-semibold transition text-sm md:text-base ${
              activeTab === 'reservations'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100'
            }`}
          >
            📋 Demandes
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
        {activeTab === 'planning' && (
          <ErrorBoundary
            name="Assistante Planning Tab"
            title="Erreur de planning"
            message="Impossible de charger le planning."
          >
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Mon planning
              </h2>
              {assistanteId ? (
                <AvailabilityCalendar
                  assistanteId={assistanteId}
                  mode="view"
                  showChildNames={true}
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Veuillez d'abord compléter votre profil pour voir votre planning.</p>
                  <button
                    onClick={() => setActiveTab('profil')}
                    className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                  >
                    Compléter mon profil
                  </button>
                </div>
              )}
            </div>
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