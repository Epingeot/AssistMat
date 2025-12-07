import { useState } from 'react'

export default function SearchBar({ onSearch }) {
  const [ville, setVille] = useState('')
  const [codePostal, setCodePostal] = useState('')
  const [rayon, setRayon] = useState(10)
  const [typesAccueil, setTypesAccueil] = useState([])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSearch({ ville, codePostal, rayon, typesAccueil })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-4 md:p-6">
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
            🔍 Rechercher
          </button>
        </div>
      </div>

      {/* Filtres par options de service */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Options de service (facultatif)
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'periscolaire', label: '🎒 Périscolaire' },
            { value: 'remplacements', label: '🔄 Remplacements' }
          ].map(type => (
            <label
              key={type.value}
              className={`px-3 py-2.5 md:py-2 border-2 rounded-lg cursor-pointer transition text-center ${
                typesAccueil.includes(type.value)
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400 active:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={typesAccueil.includes(type.value)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setTypesAccueil([...typesAccueil, type.value])
                  } else {
                    setTypesAccueil(typesAccueil.filter(t => t !== type.value))
                  }
                }}
                className="sr-only"
              />
              <span className="text-sm font-medium">{type.label}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Filtrer par assistantes proposant ces services additionnels
        </p>
      </div>
    </form>
  )
}