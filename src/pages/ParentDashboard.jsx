import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useGeocoding } from '../hooks/useGeocoding'
import MapView from '../components/Parent/MapView'
import AssistanteCard from '../components/Parent/AssistanteCard'
import SearchBar from '../components/Parent/SearchBar'
import ReservationModal from '../components/Parent/ReservationModal'
import ReservationsList from '../components/Parent/ReservationsList'
import { logger } from '../utils/logger'
import ErrorBoundary from '../components/ErrorBoundary'
import toast from 'react-hot-toast'


export default function ParentDashboard() {
  const { profile, signOut } = useAuth()
  const { geocodeAddress } = useGeocoding()

  const [assistantes, setAssistantes] = useState([])
  const [searchCenter, setSearchCenter] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedAssistante, setSelectedAssistante] = useState(null)

  // reservation modal state and handlers
  const [showReservationModal, setShowReservationModal] = useState(false)
  const [assistanteToBook, setAssistanteToBook] = useState(null)

  const [activeTab, setActiveTab] = useState('recherche') // 'recherche' ou 'reservations'

  const handleSearch = async ({ ville, codePostal, rayon }) => {
    if (!ville && !codePostal) {
      setError('Veuillez entrer une ville ou un code postal')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Géocoder la recherche
      const coords = await geocodeAddress(
        '',
        codePostal || '',
        ville || ''
      )

      logger.log('Search coordinates:', coords)

      // Store search center for map
      setSearchCenter([coords.latitude, coords.longitude])

      // Rechercher les assistantes dans un rayon
      const { data, error: searchError } = await supabase.rpc(
        'rechercher_assistantes_par_distance',
        {
          lat: coords.latitude,
          lon: coords.longitude,
          rayon_km: rayon
        }
      )

      if (searchError) throw searchError

      logger.log('Assistantes trouvées:', data)

      // Enrichir avec les jours ouvrables
      const enrichedData = await Promise.all(
        data.map(async (assistante) => {
          const { data: jours } = await supabase
            .from('jours_ouvrables')
            .select('jour')
            .eq('assistante_id', assistante.id)

          return {
            ...assistante,
            jours_ouvrables: jours?.map(j => j.jour) || []
          }
        })
      )

      setAssistantes(enrichedData)

      if (enrichedData.length === 0) {
        setError('Aucune assistante maternelle trouvée dans ce secteur')
      }
    } catch (err) {
      logger.error('Search error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAssistante = (assistante) => {
    setAssistanteToBook(assistante)
    setShowReservationModal(true)
  }

  const handleReservationSuccess = (reservation) => {
    setShowReservationModal(false)
    toast.success('Demande de réservation envoyée avec succès !')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">AssistMat</h1>
            <p className="text-sm text-gray-600">Trouvez votre assistante maternelle</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">
              {profile?.prenom} {profile?.nom}
            </span>
            <button
              onClick={signOut}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </nav>

      {/* Onglets */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('recherche')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'recherche'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            🔍 Rechercher
          </button>
          <button
            onClick={() => setActiveTab('reservations')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'reservations'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            📅 Mes réservations
          </button>
        </div>
      </div>
      
      {/* Contenu */}
      {activeTab === 'recherche' && (
        <ErrorBoundary
          name="Parent Search Tab"
          title="Erreur de recherche"
          message="La recherche d'assistantes maternelles a rencontré un problème."
        >
          <div className="max-w-7xl mx-auto px-4 py-8">
            <SearchBar onSearch={handleSearch} />

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {loading && (
            <div className="mt-8 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Recherche en cours...</p>
            </div>
          )}

          {!loading && assistantes.length > 0 && (
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Liste */}
              <div className="lg:col-span-1 space-y-4 max-h-screen overflow-y-auto">
                <h2 className="text-xl font-bold text-gray-800 sticky top-0 bg-blue-50 py-2">
                  {assistantes.length} résultat{assistantes.length > 1 ? 's' : ''}
                </h2>
                {assistantes.map(assistante => (
                  <AssistanteCard
                    key={assistante.id}
                    assistante={assistante}
                    onSelect={handleSelectAssistante}
                  />
                ))}
              </div>

              {/* Carte */}
              <div className="lg:col-span-2 h-[600px]">
                <ErrorBoundary
                  name="Parent MapView"
                  fallback={() => (
                    <div className="h-full bg-yellow-50 border-2 border-yellow-300 rounded-lg flex items-center justify-center p-8">
                      <div className="text-center">
                        <div className="text-6xl mb-4">🗺️</div>
                        <h3 className="text-xl font-bold text-yellow-900 mb-2">
                          Carte temporairement indisponible
                        </h3>
                        <p className="text-yellow-800">
                          Utilisez la liste à gauche pour voir les résultats.
                        </p>
                      </div>
                    </div>
                  )}
                >
                  <MapView
                    assistantes={assistantes}
                    searchCenter={searchCenter}
                    onSelectAssistante={setSelectedAssistante}
                  />
                </ErrorBoundary>
              </div>
            </div>
          )}

          {!loading && assistantes.length === 0 && !error && (
            <div className="mt-12 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Lancez une recherche
              </h3>
              <p className="text-gray-600">
                Entrez une ville ou un code postal pour trouver des assistantes maternelles
              </p>
            </div>
          )}

          </div>
        </ErrorBoundary>
      )}

      {activeTab === 'reservations' && (
        <ErrorBoundary
          name="Parent Reservations Tab"
          title="Erreur de réservations"
          message="Impossible de charger vos réservations."
        >
          <div className="max-w-7xl mx-auto px-4 py-8">
            <ReservationsList />
          </div>
        </ErrorBoundary>
      )}

      {/* Modal de réservation */}
      {showReservationModal && assistanteToBook && (
        <ReservationModal
          assistante={assistanteToBook}
          onClose={() => setShowReservationModal(false)}
          onSuccess={handleReservationSuccess}
        />
      )}
      
    </div>
  )
}
