import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { logger } from '../../utils/logger'
import toast from 'react-hot-toast'
import { JOURS, formatTime, getDayName, parseLocalDate, formatDuration } from '../../utils/scheduling'
import MessageThread from '../Messaging/MessageThread'

const TERMINAL_STATUSES = ['finalisee', 'refusee', 'annulee']

export default function ReservationsList() {
  const { user } = useAuth()
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('demande') // 'all', 'demande', 'finalisee', 'refusee', 'annulee'
  const [pendingAction, setPendingAction] = useState(null) // { reservationId, action: 'finalize' | 'refuse' }
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    loadReservations()
  }, [user])

  const loadReservations = async () => {
    try {
      // Récupérer l'ID de l'assistante
      const { data: assistante } = await supabase
        .from('assistantes_maternelles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!assistante) {
        setLoading(false)
        return
      }

      // Récupérer les réservations avec enfant et créneaux
      const { data: reservations, error } = await supabase
        .from('reservations')
        .select(`
          *,
          parent:profiles!reservations_parent_id_fkey(prenom, nom, email),
          child:children!reservations_child_id_fkey(id, prenom, rgpd_consent_display_name),
          slots:reservation_slots!reservation_slots_reservation_id_fkey(*)
        `)
        .eq('assistante_id', assistante.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setReservations(reservations || [])
    } catch (err) {
      logger.error('Error loading reservations:', err)
    } finally {
      setLoading(false)
    }
  }

  const confirmPendingAction = async () => {
    if (!pendingAction) return
    const newStatut = pendingAction.action === 'finalize' ? 'finalisee' : 'refusee'
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ statut: newStatut })
        .eq('id', pendingAction.reservationId)

      if (error) throw error

      toast.success(
        newStatut === 'finalisee'
          ? 'Mise en relation finalisée'
          : 'Demande refusée'
      )
      setPendingAction(null)
      loadReservations()
    } catch (err) {
      logger.error('Error updating status:', err)
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setUpdating(false)
    }
  }

  const filteredReservations = filter === 'all'
    ? reservations
    : reservations.filter(r => r.statut === filter)

  const counts = {
    all: reservations.length,
    demande: reservations.filter(r => r.statut === 'demande').length,
    finalisee: reservations.filter(r => r.statut === 'finalisee').length,
    refusee: reservations.filter(r => r.statut === 'refusee').length,
    annulee: reservations.filter(r => r.statut === 'annulee').length,
  }

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  if (reservations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-6xl mb-4">📅</div>
        <h3 className="text-xl font-semibold text-ink mb-2">
          Aucune demande
        </h3>
        <p className="text-muted">
          Les demandes apparaîtront ici.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-ink">
        Demandes
      </h2>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('demande')}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            filter === 'demande'
              ? 'bg-warning text-ink'
              : 'bg-white text-ink hover:bg-soft'
          }`}
        >
          💬 En cours ({counts.demande})
        </button>
        <button
          onClick={() => setFilter('finalisee')}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            filter === 'finalisee'
              ? 'bg-accent text-ink'
              : 'bg-white text-ink hover:bg-soft'
          }`}
        >
          ✅ Finalisées ({counts.finalisee})
        </button>
        <button
          onClick={() => setFilter('refusee')}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            filter === 'refusee'
              ? 'bg-error text-white'
              : 'bg-white text-ink hover:bg-soft'
          }`}
        >
          🚫 Refusées ({counts.refusee})
        </button>
        <button
          onClick={() => setFilter('annulee')}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            filter === 'annulee'
              ? 'bg-error text-white'
              : 'bg-white text-ink hover:bg-soft'
          }`}
        >
          ❌ Annulées ({counts.annulee})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            filter === 'all'
              ? 'bg-primary text-white'
              : 'bg-white text-ink hover:bg-soft'
          }`}
        >
          Toutes ({counts.all})
        </button>
      </div>

      {/* Empty state for filtered results */}
      {filteredReservations.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-muted">
            {filter === 'demande' && 'Aucune demande en cours'}
            {filter === 'finalisee' && 'Aucune mise en relation finalisée'}
            {filter === 'refusee' && 'Aucune demande refusée'}
            {filter === 'annulee' && 'Aucune demande annulée'}
            {filter === 'all' && 'Aucune demande'}
          </p>
        </div>
      )}

      {filteredReservations.map(reservation => {
        // Get child display name based on RGPD consent
        const childName = reservation.child?.rgpd_consent_display_name
          ? reservation.child.prenom
          : 'Enfant (nom masqué)'

        const isRemplacement = reservation.is_remplacement
        const duree = isRemplacement
          ? formatDuration(parseLocalDate(reservation.date_debut), parseLocalDate(reservation.date_fin))
          : null

          // Group slots by day
        const slotsByDay = {}
        if (reservation.slots) {
          reservation.slots.forEach(slot => {
            const dayName = getDayName(slot.jour)
            if (!slotsByDay[dayName]) {
              slotsByDay[dayName] = []
            }
            slotsByDay[dayName].push(slot)
          })
        }

        return (
          <div
            key={reservation.id}
            className="bg-white rounded-lg shadow-md p-6 border-l-4 border-primary"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-ink">
                  {reservation.parent.prenom} {reservation.parent.nom}
                </h3>
                <p className="text-sm text-muted">{reservation.parent.email}</p>
                {isRemplacement && (
                  <p className="text-xs text-accent mt-1">Remplacement</p>
                )}
                {reservation.child && (
                  <p className="text-sm text-secondary font-medium mt-1">
                    👶 Pour : {childName}
                  </p>
                )}
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  reservation.statut === 'demande'
                    ? 'bg-warning/20 text-warning'
                    : reservation.statut === 'finalisee'
                    ? 'bg-success/20 text-ink'
                    : 'bg-error/20 text-error'
                }`}
              >
                {reservation.statut === 'demande' && '💬 En cours'}
                {reservation.statut === 'finalisee' && '✅ Finalisée'}
                {reservation.statut === 'refusee' && '🚫 Refusée'}
                {reservation.statut === 'annulee' && '❌ Annulée'}
              </span>
            </div>

            <div className={`grid gap-4 mb-4 ${isRemplacement ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div>
                <p className="text-sm text-muted">Début</p>
                <p className="font-semibold">
                  {format(parseLocalDate(reservation.date_debut), 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
              {isRemplacement && (
                <div>
                  <p className="text-sm text-muted">Fin</p>
                  <p className="font-semibold">
                    {format(parseLocalDate(reservation.date_fin), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                  <p className="text-sm text-muted">Durée : {duree}</p>
                </div>
              )}
            </div>

            {/* Time slots by day */}
            <div className="mb-4">
              <p className="text-sm text-muted mb-2">Créneaux demandés :</p>
              {Object.keys(slotsByDay).length > 0 ? (
                <div className="space-y-2">
                  {JOURS.filter(jour => slotsByDay[jour]).map(jour => (
                    <div key={jour} className="flex items-center gap-2">
                      <span className="w-20 text-sm font-medium text-ink capitalize">
                        {jour}
                      </span>
                      <div className="flex gap-1 flex-wrap">
                        {slotsByDay[jour].map((slot, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-primary/20 text-primary rounded text-xs"
                          >
                            {formatTime(slot.heure_debut)} - {formatTime(slot.heure_fin)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted italic">Aucun créneau spécifié</p>
              )}
            </div>

            {/* Conversation thread */}
            <div className="mb-4">
              <MessageThread
                reservationId={reservation.id}
                currentUserId={user.id}
                userLabels={{
                  [user.id]: 'Vous',
                  [reservation.parent_id]: reservation.parent.prenom
                }}
                isLocked={TERMINAL_STATUSES.includes(reservation.statut)}
                lockedReason="Cette demande est terminée. Le fil est en lecture seule."
              />
            </div>

            {reservation.statut === 'demande' && (
              <div className="flex gap-3 mt-4 pt-4 border-t border-hairline">
                <button
                  onClick={() => setPendingAction({ reservationId: reservation.id, action: 'finalize' })}
                  className="flex-1 bg-success text-ink py-2 rounded-lg font-semibold hover:bg-success/90 transition"
                >
                  ✅ Finaliser
                </button>
                <button
                  onClick={() => setPendingAction({ reservationId: reservation.id, action: 'refuse' })}
                  className="flex-1 bg-error text-white py-2 rounded-lg font-semibold hover:bg-error/90 transition"
                >
                  🚫 Refuser
                </button>
              </div>
            )}
          </div>
        )
      })}

      {/* Confirmation modal for Finaliser / Refuser */}
      {pendingAction && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => !updating && setPendingAction(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-hairline bg-soft">
              <h3 className="text-lg font-bold text-ink">
                {pendingAction.action === 'finalize'
                  ? 'Finaliser la mise en relation'
                  : 'Refuser la demande'}
              </h3>
            </div>

            <div className="p-5">
              <p className="text-sm text-ink">
                {pendingAction.action === 'finalize'
                  ? 'La mise en relation sera ajoutée à votre planning et le parent verra vos coordonnées.'
                  : 'Cette action est définitive. Le fil de discussion sera fermé.'}
              </p>
            </div>

            <div className="p-4 border-t border-hairline bg-soft flex justify-end gap-3">
              <button
                onClick={() => setPendingAction(null)}
                disabled={updating}
                className="px-4 py-2 text-ink bg-white border border-line rounded-lg hover:bg-soft transition disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmPendingAction}
                disabled={updating}
                className={`px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50 ${
                  pendingAction.action === 'finalize'
                    ? 'bg-success text-ink hover:bg-success/90'
                    : 'bg-error text-white hover:bg-error/90'
                }`}
              >
                {updating
                  ? 'Enregistrement...'
                  : pendingAction.action === 'finalize'
                  ? '✅ Finaliser'
                  : '🚫 Refuser'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}