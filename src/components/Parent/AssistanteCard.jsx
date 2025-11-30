export default function AssistanteCard({ assistante, onSelect }) {
  return (
    <div
      onClick={() => onSelect(assistante)}
      className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition cursor-pointer border-2 border-transparent hover:border-purple-300"
    >
      <div className="flex gap-3 mb-3">
        {/* Photo */}
        {assistante.photo_url ? (
          <img
            src={assistante.photo_url}
            alt={`${assistante.prenom} ${assistante.nom}`}
            className="w-16 h-16 rounded-full object-cover border-2 border-purple-200 flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center flex-shrink-0">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}

        {/* Name and address */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-800">
            {assistante.prenom} {assistante.nom}
          </h3>
          <p className="text-sm text-gray-600">
            📍 {assistante.adresse}, {assistante.code_postal} {assistante.ville}
          </p>
        </div>

        {/* Tarifs */}
        <div className="text-right flex-shrink-0">
          {assistante.tarif_journalier && (
            <>
              <p className="text-2xl font-bold text-purple-600">
                {assistante.tarif_journalier}€
              </p>
              <p className="text-xs text-gray-500">par jour</p>
            </>
          )}
          {assistante.tarif_horaire && (
            <>
              <p className={assistante.tarif_journalier ? "text-lg font-semibold text-purple-500 mt-1" : "text-2xl font-bold text-purple-600"}>
                {assistante.tarif_horaire}€
              </p>
              <p className="text-xs text-gray-500">par heure</p>
            </>
          )}
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

      {assistante.types_accueil && assistante.types_accueil.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1">Types d'accueil :</p>
          <div className="flex gap-1 flex-wrap">
            {assistante.types_accueil.map(type => {
              const labels = {
                regulier: '🕐 Régulier',
                temps_partiel: '⏰ Temps partiel',
                periscolaire: '🎒 Périscolaire',
                occasionnel: '👶 Occasionnel'
              }
              return (
                <span
                  key={type}
                  className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium"
                >
                  {labels[type] || type}
                </span>
              )
            })}
          </div>
        </div>
      )}

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

      {/* Additional info badges */}
      {(assistante.has_garden || assistante.has_pets) && (
        <div className="mb-3">
          <div className="flex gap-2 flex-wrap">
            {assistante.has_garden && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                🌳 Jardin
              </span>
            )}
            {assistante.has_pets && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                🐾 Animaux {assistante.pets_description && `(${assistante.pets_description})`}
              </span>
            )}
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
          {assistante.agrement_date && ` (obtenu le ${new Date(assistante.agrement_date).toLocaleDateString('fr-FR')})`}
        </p>
      )}
    </div>
  )
}
