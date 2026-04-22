import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { logger } from '../../utils/logger'
import toast from 'react-hot-toast'
import { JOURS, formatTime, getDayName, parseLocalDate, formatDuration } from '../../utils/scheduling'
import MessageThread from '../Messaging/MessageThread'
import ReservationModal from './ReservationModal'

const TERMINAL_STATUSES = ['finalisee', 'refusee', 'annulee']

export default function ReservationsList() {
  const { user } = useAuth()
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('demande') // 'demande', 'finalisee', 'closed' (refusee + annulee)
  const [cancelTarget, setCancelTarget] = useState(null) // reservationId pending cancellation
  const [cancelling, setCancelling] = useState(false)
  const [editTarget, setEditTarget] = useState(null) // full reservation object being edited

  useEffect(() => {
    if (user) {
      loadReservations()
    }
  }, [user])

  const loadReservations = async () => {
    try {
      setLoading(true)

      // Narrow the assistante join: sensitive columns (adresse/telephone/email)
      // are fetched separately via get_reservation_contact, gated on contact_shared
      // or finalisee. The table-level GRANT will eventually block direct access.
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          assistante:assistantes_maternelles!reservations_assistante_id_fkey(
            id, user_id, ville, code_postal, max_kids, vacation_weeks,
            profile:profiles!assistantes_maternelles_user_id_fkey(nom, prenom)
          ),
          child:children!reservations_child_id_fkey(id, prenom),
          slots:reservation_slots!reservation_slots_reservation_id_fkey(*)
        `)
        .eq('parent_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Merge contact info for reservations where the gate passes.
      const enriched = await Promise.all((data || []).map(async (r) => {
        const canSeeContact = r.contact_shared || r.statut === 'finalisee'
        if (!canSeeContact) return r
        const { data: contactRows, error: contactErr } = await supabase
          .rpc('get_reservation_contact', { p_reservation_id: r.id })
        if (contactErr) {
          logger.error('Error loading contact for reservation', r.id, contactErr)
          return r
        }
        const contact = contactRows?.[0] || {}
        return { ...r, assistante: { ...r.assistante, ...contact } }
      }))

      logger.log('Reservations loaded:', enriched)
      setReservations(enriched)
    } catch (err) {
      logger.error('Error loading reservations:', err)
    } finally {
      setLoading(false)
    }
  }

  const confirmCancel = async () => {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ statut: 'annulee' })
        .eq('id', cancelTarget)

      if (error) throw error

      setCancelTarget(null)
      await loadReservations()
    } catch (err) {
      logger.error('Error canceling reservation:', err)
      toast.error('Erreur lors de l\'annulation')
    } finally {
      setCancelling(false)
    }
  }

  const isClosed = (r) => r.statut === 'refusee' || r.statut === 'annulee'

  const filteredReservations = filter === 'closed'
      ? reservations.filter(isClosed)
      : reservations.filter(r => r.statut === filter)

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-lg text-muted">Chargement...</div>
      </div>
    )
  }

  if (reservations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-6xl mb-4">📅</div>
        <h3 className="text-xl font-semibold text-ink mb-2">
          Aucune demande
        </h3>
        <p className="text-muted">
          Vos demandes apparaîtront ici.
        </p>
      </div>
    )
  }

  const counts = {
    demande: reservations.filter(r => r.statut === 'demande').length,
    finalisee: reservations.filter(r => r.statut === 'finalisee').length,
    closed: reservations.filter(isClosed).length,
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-ink">
          Mes demandes
        </h2>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('demande')}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            filter === 'demande'
              ? 'bg-primary text-white'
              : 'bg-white text-ink hover:bg-soft'
          }`}
        >
          💬 En cours ({counts.demande})
        </button>
        <button
          onClick={() => setFilter('finalisee')}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            filter === 'finalisee'
              ? 'bg-success text-white'
              : 'bg-white text-ink hover:bg-soft'
          }`}
        >
          ✅ Finalisées ({counts.finalisee})
        </button>
        <button
          onClick={() => setFilter('closed')}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            filter === 'closed'
              ? 'bg-error text-white'
              : 'bg-white text-ink hover:bg-soft'
          }`}
        >
          🚫 Annulées / Refusées ({counts.closed})
        </button>
      </div>

      {/* Empty state for filtered results */}
      {filteredReservations.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-muted">
            {filter === 'demande' && 'Aucune demande en cours'}
            {filter === 'finalisee' && 'Aucune mise en relation finalisée'}
            {filter === 'closed' && 'Aucune demande refusée ou annulée'}
          </p>
        </div>
      )}

      {/* Liste des réservations */}
      <div className="space-y-4">
        {filteredReservations.map(reservation => {
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
              className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                reservation.statut === 'demande' ? 'border-primary' :
                reservation.statut === 'finalisee' ? 'border-success' :
                'border-error'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-ink">
                    {reservation.assistante.profile.prenom} {reservation.assistante.profile.nom}
                  </h3>
                  {(() => {
                    const contactVisible = reservation.contact_shared || reservation.statut === 'finalisee'
                    return (
                      <>
                        <p className="text-sm text-muted">
                          {contactVisible
                            ? `${reservation.assistante.adresse}, ${reservation.assistante.code_postal} ${reservation.assistante.ville}`
                            : `${reservation.assistante.code_postal} ${reservation.assistante.ville}`}
                        </p>
                        {contactVisible && (reservation.assistante.telephone || reservation.assistante.email) && (
                          <div className="mt-2 text-sm">
                            {reservation.assistante.telephone && (
                              <a href={`tel:${reservation.assistante.telephone}`} className="text-muted hover:underline mr-3">
                                📞 {reservation.assistante.telephone}
                              </a>
                            )}
                            {reservation.assistante.email && (
                              <a href={`mailto:${reservation.assistante.email}`} className="text-muted hover:underline">
                                ✉️ {reservation.assistante.email}
                              </a>
                            )}
                          </div>
                        )}
                      </>
                    )
                  })()}
                  {isRemplacement && (
                    <p className="text-xs text-accent mt-1">Remplacement</p>
                  )}
                  {reservation.child && (
                    <p className="text-sm text-secondary font-medium mt-1">
                      👶 Pour : {reservation.child.prenom}
                    </p>
                  )}
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    reservation.statut === 'demande'
                      ? 'bg-primary/20 text-primary'
                      : reservation.statut === 'finalisee'
                      ? 'bg-success/20 text-success'
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
                <p className="text-sm text-muted mb-2">Créneaux réservés :</p>
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
              <div className="mb-4 pt-4 border-t border-hairline">
                <MessageThread
                  reservationId={reservation.id}
                  currentUserId={user.id}
                  userLabels={{
                    [user.id]: 'Vous',
                    [reservation.assistante.user_id]: reservation.assistante.profile.prenom
                  }}
                  isLocked={TERMINAL_STATUSES.includes(reservation.statut)}
                  lockedReason="Cette demande est terminée. Le fil est en lecture seule."
                />
              </div>

              {reservation.statut === 'demande' && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    onClick={() => setEditTarget(reservation)}
                    className="px-4 py-2 bg-white border border-primary text-primary rounded-lg hover:bg-primary/10 transition font-semibold"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => setCancelTarget(reservation.id)}
                    className="px-4 py-2 bg-error text-white rounded-lg hover:bg-error/90 transition font-semibold"
                  >
                    Annuler la demande
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Confirmation modal for cancellation */}
      {cancelTarget && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => !cancelling && setCancelTarget(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-hairline bg-soft">
              <h3 className="text-lg font-bold text-ink">
                Annuler la demande
              </h3>
            </div>

            <div className="p-5">
              <p className="text-sm text-ink">
                Cette action est définitive. Le fil de discussion sera fermé.
              </p>
            </div>

            <div className="p-4 border-t border-hairline bg-soft flex justify-end gap-3">
              <button
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
                className="px-4 py-2 text-ink bg-white border border-line rounded-lg hover:bg-soft transition disabled:opacity-50"
              >
                Retour
              </button>
              <button
                onClick={confirmCancel}
                disabled={cancelling}
                className="px-4 py-2 bg-error text-white rounded-lg font-semibold hover:bg-error/90 transition disabled:opacity-50"
              >
                {cancelling ? 'Annulation...' : '❌ Annuler la demande'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal — reuses ReservationModal in edit mode */}
      {editTarget && (
        <ReservationModal
          assistante={{
            ...editTarget.assistante,
            prenom: editTarget.assistante.profile?.prenom,
            nom: editTarget.assistante.profile?.nom,
          }}
          reservation={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={() => {
            setEditTarget(null)
            toast.success('Demande modifiée')
            loadReservations()
          }}
        />
      )}
    </div>
  )
}