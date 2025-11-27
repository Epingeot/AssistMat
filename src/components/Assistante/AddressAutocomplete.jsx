import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { logger } from '../../utils/logger'

export default function AddressAutocomplete({ onSelectAddress, initialValue = '' }) {
  const [query, setQuery] = useState(initialValue)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef(null)

  // Fermer les suggestions si clic à l'extérieur
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Rechercher des suggestions
  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([])
      return
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true)
      try {
        const response = await axios.get('https://api-adresse.data.gouv.fr/search/', {
          params: {
            q: query,
            limit: 5,
            type: 'housenumber',
            autocomplete: 1
          }
        })

        if (response.data.features) {
          setSuggestions(response.data.features)
          setShowSuggestions(true)
        }
      } catch (err) {
        logger.error('Autocomplete error:', err)
      } finally {
        setLoading(false)
      }
    }, 300) // Debounce de 300ms

    return () => clearTimeout(timeoutId)
  }, [query])

  const handleSelect = (feature) => {
    const props = feature.properties
    const coords = feature.geometry.coordinates

    setQuery(props.label)
    setShowSuggestions(false)

    // Extraire les infos
    const address = {
      fullAddress: props.label,
      street: props.name,
      postcode: props.postcode,
      city: props.city,
      latitude: coords[1],
      longitude: coords[0],
      score: props.score
    }

    onSelectAddress(address)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Adresse complète *
      </label>
      
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        placeholder="Commencez à taper votre adresse..."
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        required
      />

      {loading && (
        <div className="absolute right-3 top-[42px] text-gray-400">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((feature, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(feature)}
              className="w-full text-left px-4 py-3 hover:bg-purple-50 border-b last:border-b-0 transition"
            >
              <div className="font-medium text-gray-900">
                {feature.properties.label}
              </div>
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                <span>📍 {feature.properties.city}</span>
                <span className={`px-2 py-0.5 rounded ${
                  feature.properties.score > 0.8 
                    ? 'bg-green-100 text-green-700' 
                    : feature.properties.score > 0.5
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {(feature.properties.score * 100).toFixed(0)}% confiance
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500 mt-1">
        Tapez au moins 3 caractères pour voir les suggestions
      </p>
    </div>
  )
}