export default function AssistanteCard({ assistante, onSelect }) {
  return (
    <div 
      onClick={() => onSelect(assistante)}
      className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition cursor-pointer border-2 border-transparent hover:border-purple-300"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-800">
            {assistante.prenom} {assistante.nom}
          </h3>
          <p className="text-sm text-gray-600">
            📍 {assistante.adresse}, {assistante.code_postal} {assistante.ville}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-purple-600">
            {assistante.tarif_journalier}€
          </p>
          <p className="text-xs text-gray-500">par jour</p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1">
          <span className="text-lg">👶</span>
          <span className="text-sm font-semibold text-gray-700">
            {assistante.places_disponibles}/{assistante.places_totales} places
          </span>
        </div>
        
        {assistante.distance_km && (
          <div className="flex items-center gap-1">
            <span className="text-lg">🚗</span>
            <span className="text-sm text-gray-600">
              {assistante.distance_km.toFixed(1)} km
            </span>
          </div>
        )}
      </div>

      {assistante.jours_ouvrables && assistante.jours_ouvrables.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1">Jours disponibles :</p>
          <div className="flex gap-1 flex-wrap">
            {assistante.jours_ouvrables.map(jour => (
              <span
                key={jour}
                className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
              >
                {jour.substring(0, 3)}
              </span>
            ))}
          </div>
        </div>
      )}

      {assistante.description && (
        <p className="text-sm text-gray-600 line-clamp-2">
          {assistante.description}
        </p>
      )}

      {assistante.agrement && (
        <p className="text-xs text-gray-400 mt-2">
          Agrément : {assistante.agrement}
        </p>
      )}
    </div>
  )
}
