import { useState, useEffect } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useGeocoding } from '../hooks/useGeocoding'
import MapView from '../components/Parent/MapView'
import AssistanteCard from '../components/Parent/AssistanteCard'
import SearchBar from '../components/Parent/SearchBar'
import ReservationModal from '../components/Parent/ReservationModal'
import { calculateAvailability, parseLocalDate } from '../utils/scheduling'
import { logger } from '../utils/logger'
import ErrorBoundary from '../components/ErrorBoundary'

export default function PublicSearchPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { geocodeAddress } = useGeocoding()

  const [assistantes, setAssistantes] = useState([])
  const [searchCenter, setSearchCenter] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentDateDebut, setCurrentDateDebut] = useState(null)

  // Reservation modal state
  const [showReservationModal, setShowReservationModal] = useState(false)
  const [assistanteToBook, setAssistanteToBook] = useState(null)

  // Check for initial ville/codePostal from URL params
  const initialVille = searchParams.get('ville') || ''
  const initialCodePostal = searchParams.get('codePostal') || ''

  const handleSearch = async ({ ville, codePostal, rayon, typesAccueil, joursRecherches, dateDebut, hasGarden, petsFilter, showOnlyAvailable }) => {
    if (!ville && !codePostal) {
      setError('Veuillez entrer une ville ou un code postal')
      return
    }

    setLoading(true)
    setError(null)
    setCurrentDateDebut(dateDebut)

    try {
      // Geocode the search
      const coords = await geocodeAddress(
        '',
        codePostal || '',
        ville || ''
      )

      logger.log('Search coordinates:', coords)

      // Store search center for map
      setSearchCenter([coords.latitude, coords.longitude])

      // Search for assistants within radius
      const { data, error: searchError } = await supabase.rpc(
        'rechercher_assistantes_par_distance',
        {
          lat: coords.latitude,
          lon: coords.longitude,
          rayon_km: rayon
        }
      )

      if (searchError) throw searchError

      logger.log('Assistantes trouvees:', data)

      // Enrich with working hours and availability
      const enrichedData = await Promise.all(
        data.map(async (assistante) => {
          const { data: horaires } = await supabase
            .from('horaires_travail')
            .select('*')
            .eq('assistante_id', assistante.id)

          // Calculate earliest availability
          const availability = await calculateAvailability(
            assistante.id,
            assistante.max_kids || 4,
            horaires || [],
            supabase
          )

          return {
            ...assistante,
            horaires_travail: horaires || [],
            availability
          }
        })
      )

      // Apply filters
      let filteredData = enrichedData

      // Filter by service options
      if (typesAccueil && typesAccueil.length > 0) {
        filteredData = filteredData.filter(assistante => {
          return typesAccueil.some(type => {
            if (type === 'periscolaire') return assistante.accepts_periscolaire
            if (type === 'remplacements') return assistante.accepts_remplacements
            return false
          })
        })
      }

      // Filter by days of the week
      if (joursRecherches && joursRecherches.length > 0) {
        filteredData = filteredData.filter(assistante => {
          if (!assistante.horaires_travail || assistante.horaires_travail.length === 0) {
            return false
          }
          const workingDays = assistante.horaires_travail.map(h => h.jour)
          return joursRecherches.every(jour => workingDays.includes(jour))
        })
      }

      // Filter by garden
      if (hasGarden === true) {
        filteredData = filteredData.filter(assistante => assistante.has_garden === true)
      }

      // Filter by pets
      if (petsFilter === true) {
        filteredData = filteredData.filter(assistante => assistante.has_pets === true)
      } else if (petsFilter === false) {
        filteredData = filteredData.filter(assistante => assistante.has_pets !== true)
      }

      // Filter by availability at selected start date
      if (showOnlyAvailable) {
        if (dateDebut) {
          const selectedDate = parseLocalDate(dateDebut)
          filteredData = filteredData.filter(assistante => {
            if (!assistante.availability) return false
            const dayAvailability = assistante.availability.dayAvailability || {}
            return Object.values(dayAvailability).some(dayInfo => {
              if (dayInfo.isCDIFull || !dayInfo.availableFrom) return false
              return selectedDate >= dayInfo.availableFrom
            })
          })
        } else {
          filteredData = filteredData.filter(assistante => assistante.availability !== null)
        }
      }
      setAssistantes(filteredData)

      if (filteredData.length === 0) {
        setError('Aucune assistante maternelle trouvee avec ces criteres')
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

  const handleReservationSuccess = () => {
    setShowReservationModal(false)
    // Redirect to dashboard after successful reservation
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-purple-600">AssistMat</h1>
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-gray-600 hidden md:block">
                  {profile?.prenom} {profile?.nom}
                </span>
                <Link
                  to="/dashboard"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold text-sm"
                >
                  Mon espace
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-purple-600 font-medium text-sm"
                >
                  Connexion
                </Link>
                <Link
                  to="/login"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold text-sm"
                >
                  Inscription
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Rechercher une assistante maternelle
        </h2>

        <ErrorBoundary
          name="Public Search"
          title="Erreur de recherche"
          message="La recherche d'assistantes maternelles a rencontre un probleme."
        >
          <SearchBar onSearch={handleSearch} initialVille={initialVille} initialCodePostal={initialCodePostal} />

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {loading && (
            <div className="mt-8 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              <p className="mt-4 text-gray-600">Recherche en cours...</p>
            </div>
          )}

          {!loading && assistantes.length > 0 && (
            <div className="mt-8 flex flex-col lg:grid lg:grid-cols-3 gap-6">
              {/* List */}
              <div className="lg:col-span-1 space-y-4 max-h-96 lg:max-h-screen overflow-y-auto">
                <h3 className="text-xl font-bold text-gray-800 sticky top-0 bg-blue-50 py-2 z-10">
                  {assistantes.length} resultat{assistantes.length > 1 ? 's' : ''}
                </h3>
                {assistantes.map(assistante => (
                  <AssistanteCard
                    key={assistante.id}
                    assistante={assistante}
                    onSelect={handleSelectAssistante}
                    showContactInfo={!!user} // Only show contact info if logged in
                  />
                ))}
              </div>

              {/* Map */}
              <div className="lg:col-span-2 h-[400px] lg:h-[600px] order-first lg:order-last">
                <ErrorBoundary
                  name="Public MapView"
                  fallback={() => (
                    <div className="h-full bg-yellow-50 border-2 border-yellow-300 rounded-lg flex items-center justify-center p-8">
                      <div className="text-center">
                        <div className="text-6xl mb-4">🗺️</div>
                        <h3 className="text-xl font-bold text-yellow-900 mb-2">
                          Carte temporairement indisponible
                        </h3>
                        <p className="text-yellow-800">
                          Utilisez la liste a gauche pour voir les resultats.
                        </p>
                      </div>
                    </div>
                  )}
                >
                  <MapView
                    assistantes={assistantes}
                    searchCenter={searchCenter}
                    onSelectAssistante={handleSelectAssistante}
                    dateDebut={currentDateDebut}
                    showContactInfo={!!user}
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
        </ErrorBoundary>
      </div>

      {/* Reservation Modal - will handle auth check internally */}
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
