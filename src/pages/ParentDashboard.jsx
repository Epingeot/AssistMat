import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useGeocoding } from '../hooks/useGeocoding'
import MapView from '../components/Parent/MapView'
import AssistanteCard from '../components/Parent/AssistanteCard'
import SearchBar from '../components/Parent/SearchBar'
import ReservationModal from '../components/Parent/ReservationModal'

export default function ParentDashboard() {
  const { profile, signOut } = useAuth()
  const { geocodeAddress } = useGeocoding()

  const [assistantes, setAssistantes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedAssistante, setSelectedAssistante] = useState(null)

  // reservation modal state and handlers
  const [showReservationModal, setShowReservationModal] = useState(false)
  const [assistanteToBook, setAssistanteToBook] = useState(null)

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

      console.log('Search coordinates:', coords)

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

      console.log('Assistantes trouvées:', data)

      // Enrichir avec les jours ouvrables
      const enrichedData = await Promise.all(
        data.map(async (assistante) => {
          const { data: jours } = await supabase
            .from('jours_ouvrables')
            .select('jour')
            .eq('assistante_id', assistante.id)

          return {
            ...assistante,
            jours_ouvrables: jours?.map(j => j.jour) || [],
            // Extraire lat/lon depuis location
            latitude: coords.latitude, // TODO: extraire depuis la géographie
            longitude: coords.longitude
          }
        })
      )

      setAssistantes(enrichedData)

      if (enrichedData.length === 0) {
        setError('Aucune assistante maternelle trouvée dans ce secteur')
      }
    } catch (err) {
      console.error('Search error:', err)
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
    alert('✅ Demande de réservation envoyée avec succès !')
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

      {/* Contenu */}
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
              <MapView
                assistantes={assistantes}
                onSelectAssistante={setSelectedAssistante}
              />
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
