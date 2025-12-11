import { useState } from 'react'
import { 
  JOURS, 
  JOURS_COURTS,
  formatDateForDB,
  getToday 
} from '../../utils/scheduling'

// Get today's date as a string
const todayStr = formatDateForDB(getToday())

export default function SearchBar({ onSearch }) {
  const [ville, setVille] = useState('')
  const [codePostal, setCodePostal] = useState('')
  const [rayon, setRayon] = useState(10)
  const [typesAccueil, setTypesAccueil] = useState([])
  const [joursRecherches, setJoursRecherches] = useState([])
  const [dateDebut, setDateDebut] = useState(todayStr) // Default to today
  const [hasGarden, setHasGarden] = useState(null) // null = no filter, true = must have, false = not used
  const [petsFilter, setPetsFilter] = useState(null) // null = no filter, true = has pets, false = no pets
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true) // Default to showing only available
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSearch({
      ville,
      codePostal,
      rayon,
      typesAccueil,
      joursRecherches,
      dateDebut,
      hasGarden,
      petsFilter,
      showOnlyAvailable
    })
  }

  const toggleJour = (jourIndex) => {
    if (joursRecherches.includes(jourIndex)) {
      setJoursRecherches(joursRecherches.filter(j => j !== jourIndex))
    } else {
      setJoursRecherches([...joursRecherches, jourIndex])
    }
  }

  const hasActiveFilters = typesAccueil.length > 0 || joursRecherches.length > 0 || hasGarden !== null || petsFilter !== null

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-4 md:p-6">
      {/* Main search fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ville
          </label>
          <input
            type="text"
            value={ville}
            onChange={(e) => setVille(e.target.value)}
            placeholder="Ex: Paris"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Code postal
          </label>
          <input
            type="text"
            value={codePostal}
            onChange={(e) => setCodePostal(e.target.value)}
            placeholder="75001"
            pattern="[0-9]{5}"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rayon (km)
          </label>
          <select
            value={rayon}
            onChange={(e) => setRayon(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={5}>5 km</option>
            <option value={10}>10 km</option>
            <option value={20}>20 km</option>
            <option value={50}>50 km</option>
          </select>
        </div>

        <div className="sm:col-span-2 md:col-span-1 flex items-end">
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-2.5 md:py-2 px-4 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition text-base md:text-sm"
          >
            Rechercher
          </button>
        </div>
      </div>

      {/* Display options: Start date and availability filter */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          {/* Start date */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              Date de début :
            </label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              min={todayStr}
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Availability toggle */}
          <button
            type="button"
            onClick={() => setShowOnlyAvailable(!showOnlyAvailable)}
            className={`flex items-center gap-2 px-3 py-1.5 border-2 rounded-lg text-sm font-medium transition ${
              showOnlyAvailable
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-300 text-gray-700 hover:border-gray-400'
            }`}
          >
            {showOnlyAvailable ? '✓' : ''} Uniquement les disponibles
          </button>
        </div>
      </div>

      {/* Toggle advanced filters */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition"
        >
          <span className={`transform transition ${showAdvanced ? 'rotate-90' : ''}`}>
            ▶
          </span>
          Filtres avancés
          {hasActiveFilters && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
              {[
                typesAccueil.length,
                joursRecherches.length,
                hasGarden !== null ? 1 : 0,
                petsFilter !== null ? 1 : 0
              ].reduce((a, b) => a + b, 0)} actif(s)
            </span>
          )}
        </button>
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="mt-4 space-y-4">
          {/* Days of the week */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jours de la semaine
            </label>
            <div className="flex flex-wrap gap-2">
              {JOURS.map((jour, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleJour(index)}
                  className={`px-3 py-2 border-2 rounded-lg text-sm font-medium transition capitalize ${
                    joursRecherches.includes(index)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {JOURS_COURTS[index]}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Filtrer par assistantes travaillant ces jours
            </p>
          </div>

          {/* Garden and pets filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Garden filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jardin
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setHasGarden(hasGarden === true ? null : true)}
                  className={`px-3 py-2 border-2 rounded-lg text-sm font-medium transition ${
                    hasGarden === true
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  Avec jardin
                </button>
              </div>
            </div>

            {/* Pets filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Animaux
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPetsFilter(petsFilter === true ? null : true)}
                  className={`px-3 py-2 border-2 rounded-lg text-sm font-medium transition ${
                    petsFilter === true
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  Avec animaux
                </button>
                <button
                  type="button"
                  onClick={() => setPetsFilter(petsFilter === false ? null : false)}
                  className={`px-3 py-2 border-2 rounded-lg text-sm font-medium transition ${
                    petsFilter === false
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  Sans animaux
                </button>
              </div>
            </div>
          </div>

          {/* Service options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Options de service
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'periscolaire', label: 'Periscolaire' },
                { value: 'remplacements', label: 'Remplacements' }
              ].map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => {
                    if (typesAccueil.includes(type.value)) {
                      setTypesAccueil(typesAccueil.filter(t => t !== type.value))
                    } else {
                      setTypesAccueil([...typesAccueil, type.value])
                    }
                  }}
                  className={`px-3 py-2 border-2 rounded-lg text-sm font-medium transition ${
                    typesAccueil.includes(type.value)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Clear filters button */}
          {hasActiveFilters && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setTypesAccueil([])
                  setJoursRecherches([])
                  setHasGarden(null)
                  setPetsFilter(null)
                }}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Effacer les filtres avancés
              </button>
            </div>
          )}
        </div>
      )}
    </form>
  )
}
