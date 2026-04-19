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
      className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition cursor-pointer border-2 border-transparent hover:border-primary/40"
    >
      <div className="flex gap-3 mb-3">
        {/* Photo */}
        {assistante.photo_url ? (
          <img
            src={assistante.photo_url}
            alt={`${assistante.prenom} ${assistante.nom}`}
            className="w-16 h-16 rounded-full object-cover border-2 border-primary/30 flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-chip border-2 border-hairline flex items-center justify-center flex-shrink-0">
            <svg className="w-8 h-8 text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}

        {/* Name and address */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-ink">
            {assistante.prenom} {assistante.nom}
          </h3>
          <p className="text-sm text-muted">
            📍 {showContactInfo ? `${assistante.adresse}, ` : ''}{assistante.code_postal} {assistante.ville}
          </p>
        </div>

        {/* Max kids info */}
        <div className="text-right flex-shrink-0">
          {assistante.max_kids && (
            <>
              <p className="text-2xl font-bold text-primary">
                {assistante.max_kids}
              </p>
              <p className="text-xs text-muted">enfant{assistante.max_kids > 1 ? 's' : ''} max</p>
            </>
          )}
        </div>
      </div>

      {/* Availability badge */}
      {assistante.availability && assistante.availability.isFullyAvailable && (
        <div className="mb-3">
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-success/20 border-2 border-success rounded-lg">
            <span className="text-xl">✅</span>
            <p className="text-sm font-bold text-ink">Disponible immédiatement !</p>
          </div>
        </div>
      )}
      {assistante.availability && !assistante.availability.isFullyAvailable && assistante.availability.earliestDate && (
        <div className="mb-3">
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-info/10 border border-info/30 rounded-lg">
            <span className="text-lg">📅</span>
            <div>
              <p className="text-xs text-info font-medium">
                Disponible les {assistante.availability.availableDays.length > 1 ? 
                assistante.availability.availableDays.map(d => JOURS_COURTS[d]).join(', ')
              : JOURS[assistante.availability.availableDays[0]]}
              </p>
              <p className="text-sm font-bold text-info">
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
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-error/10 border border-error/30 rounded-lg">
            <span className="text-lg">⚠️</span>
            <p className="text-sm font-bold text-error">Complet (tous les jours réservés)</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mb-3 flex-wrap">
        {scheduleSummary && (
          <div className="flex items-center gap-1">
            <span className="text-lg">🕐</span>
            <span className="text-sm text-muted">
              ~{Math.round(scheduleSummary.avgMonthlyHours)}h/mois
            </span>
          </div>
        )}

        {assistante.distance_km && (
          <div className="flex items-center gap-1">
            <span className="text-lg">🚗</span>
            <span className="text-sm text-muted">
              {assistante.distance_km.toFixed(1)} km
            </span>
          </div>
        )}

        {assistante.max_days_per_week_per_kid && (
          <div className="flex items-center gap-1">
            <span className="text-lg">📅</span>
            <span className="text-sm text-muted">
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
              <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full font-medium">
                🎒 Périscolaire
              </span>
            )}
            {assistante.accepts_remplacements && (
              <span className="px-2 py-1 bg-warning/20 text-warning text-xs rounded-full font-medium">
                🔄 Accepte les remplacements
              </span>
            )}
          </div>
        </div>
      )}

      {/* Working days from horaires_travail */}
      {scheduleSummary && scheduleSummary.workingDays.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-muted mb-1">Jours de travail :</p>
          <div className="flex gap-1 flex-wrap">
            {scheduleSummary.workingDays.map(jourNum => {
              const h = assistante.horaires_travail.find(ht => ht.jour === jourNum)
              const jourName = typeof jourNum === 'number' ? JOURS[jourNum] : jourNum
              return (
                <span
                  key={jourNum}
                  className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full"
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
              <span className="px-2 py-1 bg-accent/20 text-accent text-xs rounded-full font-medium">
                🌳 Jardin
              </span>
            )}
            {assistante.has_pets && (
              <span className="px-2 py-1 bg-peach/20 text-peach text-xs rounded-full font-medium">
                🐾 Animaux {assistante.pets_description && `(${assistante.pets_description})`}
              </span>
            )}
          </div>
        </div>
      )}

      {assistante.description && (
        <p className="text-sm text-muted line-clamp-2">
          {assistante.description}
        </p>
      )}

      {assistante.agrement && (
        <p className="text-xs text-subtle mt-2">
          Agrément : {assistante.agrement}
          {assistante.agrement_date && ` (obtenu le ${new Date(assistante.agrement_date).toLocaleDateString('fr-FR')})`}
        </p>
      )}

      {/* Contact Information */}
      {(assistante.telephone || assistante.email) && (
        <div className="mt-3 pt-3 border-t border-hairline">
          {showContactInfo ? (
            <>
              <p className="text-xs font-medium text-ink mb-2">Contact :</p>
              <div className="space-y-1">
                {assistante.telephone && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📞</span>
                    <a
                      href={`tel:${assistante.telephone}`}
                      className="text-sm text-primary hover:text-primary/80 hover:underline"
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
                      className="text-sm text-primary hover:text-primary/80 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {assistante.email}
                    </a>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted italic">
              Connectez-vous pour voir les coordonnées
            </p>
          )}
        </div>
      )}
    </div>
  )
}
