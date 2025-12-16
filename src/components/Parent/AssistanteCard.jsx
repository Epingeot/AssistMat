import { JOURS, JOURS_COURTS, formatTime, calculateAvgHoursPerMonth, calculateWeeklyHours, getToday } from '../../utils/scheduling'

export default function AssistanteCard({ assistante, onSelect, showContactInfo = true }) {
  // Build schedule summary from horaires_travail if available
  const getScheduleSummary = () => {
    if (!assistante.horaires_travail || assistante.horaires_travail.length === 0) {
      return null
    }

    // calculateWeeklyHours expects array with heure_debut and heure_fin
    const weeklyHours = calculateWeeklyHours(assistante.horaires_travail)
    const avgMonthlyHours = calculateAvgHoursPerMonth(weeklyHours, assistante.vacation_weeks || 5)

    return {
      weeklyHours,
      avgMonthlyHours,
      workingDays: assistante.horaires_travail.map(h => h.jour)
    }
  }

  const scheduleSummary = getScheduleSummary()

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
            📍 {showContactInfo ? `${assistante.adresse}, ` : ''}{assistante.code_postal} {assistante.ville}
          </p>
        </div>

        {/* Max kids info */}
        <div className="text-right flex-shrink-0">
          {assistante.max_kids && (
            <>
              <p className="text-2xl font-bold text-purple-600">
                {assistante.max_kids}
              </p>
              <p className="text-xs text-gray-500">enfant{assistante.max_kids > 1 ? 's' : ''} max</p>
            </>
          )}
        </div>
      </div>

      {/* Availability badge */}
      {assistante.availability && assistante.availability.isFullyAvailable && (
        <div className="mb-3">
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-green-100 border-2 border-green-400 rounded-lg">
            <span className="text-xl">✅</span>
            <p className="text-sm font-bold text-green-800">Disponible immédiatement !</p>
          </div>
        </div>
      )}
      {assistante.availability && !assistante.availability.isFullyAvailable && assistante.availability.earliestDate && (
        <div className="mb-3">
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-blue-100 border border-blue-300 rounded-lg">
            <span className="text-lg">📅</span>
            <div>
              <p className="text-xs text-blue-700 font-medium">
                Disponible les {assistante.availability.availableDays.length > 1 ? 
                assistante.availability.availableDays.map(d => JOURS_COURTS[d]).join(', ')
              : JOURS[assistante.availability.availableDays[0]]}
              </p>
              <p className="text-sm font-bold text-blue-800">
                {assistante.availability.earliestDate <= getToday() ?
                  'immédiatement'
                : `dès le ${assistante.availability.earliestDate.toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}`}
              </p>
            </div>
          </div>
        </div>
      )}
      {!assistante.availability && assistante.horaires_travail?.length > 0 && (
        <div className="mb-3">
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-red-100 border border-red-300 rounded-lg">
            <span className="text-lg">⚠️</span>
            <p className="text-sm font-bold text-red-800">Complet (tous les jours réservés)</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mb-3 flex-wrap">
        {scheduleSummary && (
          <div className="flex items-center gap-1">
            <span className="text-lg">🕐</span>
            <span className="text-sm text-gray-600">
              ~{Math.round(scheduleSummary.avgMonthlyHours)}h/mois
            </span>
          </div>
        )}

        {assistante.distance_km && (
          <div className="flex items-center gap-1">
            <span className="text-lg">🚗</span>
            <span className="text-sm text-gray-600">
              {assistante.distance_km.toFixed(1)} km
            </span>
          </div>
        )}

        {assistante.max_days_per_week_per_kid && (
          <div className="flex items-center gap-1">
            <span className="text-lg">📅</span>
            <span className="text-sm text-gray-600">
              max {assistante.max_days_per_week_per_kid}j/sem/enfant
            </span>
          </div>
        )}
      </div>

      {/* Service options */}
      {(assistante.accepts_periscolaire || assistante.accepts_remplacements) && (
        <div className="mb-3">
          <div className="flex gap-1 flex-wrap">
            {assistante.accepts_periscolaire && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                🎒 Périscolaire
              </span>
            )}
            {assistante.accepts_remplacements && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                🔄 Accepte les remplacements
              </span>
            )}
          </div>
        </div>
      )}

      {/* Working days from horaires_travail */}
      {scheduleSummary && scheduleSummary.workingDays.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1">Jours de travail :</p>
          <div className="flex gap-1 flex-wrap">
            {scheduleSummary.workingDays.map(jourNum => {
              const h = assistante.horaires_travail.find(ht => ht.jour === jourNum)
              const jourName = typeof jourNum === 'number' ? JOURS[jourNum] : jourNum
              return (
                <span
                  key={jourNum}
                  className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                  title={h ? `${formatTime(h.heure_debut)} - ${formatTime(h.heure_fin)}` : ''}
                >
                  {jourName ? jourName.substring(0, 3) : jourNum}
                </span>
              )
            })}
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

      {/* Contact Information */}
      {(assistante.telephone || assistante.email) && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          {showContactInfo ? (
            <>
              <p className="text-xs font-medium text-gray-700 mb-2">Contact :</p>
              <div className="space-y-1">
                {assistante.telephone && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📞</span>
                    <a
                      href={`tel:${assistante.telephone}`}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {assistante.telephone}
                    </a>
                  </div>
                )}
                {assistante.email && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">✉️</span>
                    <a
                      href={`mailto:${assistante.email}`}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {assistante.email}
                    </a>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-500 italic">
              Connectez-vous pour voir les coordonnées
            </p>
          )}
        </div>
      )}
    </div>
  )
}
