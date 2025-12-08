import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { logger } from '../../utils/logger'
import toast from 'react-hot-toast'
import { JOURS, formatTime } from '../../utils/scheduling'

export default function ReservationsList() {
  const { user } = useAuth()
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)

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
          child:children(id, prenom, rgpd_consent_display_name),
          slots:reservation_slots(*)
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

  const updateStatut = async (reservationId, newStatut) => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ statut: newStatut })
        .eq('id', reservationId)

      if (error) throw error
      
      // Recharger
      loadReservations()
    } catch (err) {
      logger.error('Error updating status:', err)
      toast.error('Erreur lors de la mise à jour')
    }
  }

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  if (reservations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-6xl mb-4">📅</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          Aucune réservation
        </h3>
        <p className="text-gray-600">
          Les demandes de réservation apparaîtront ici.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Demandes de réservation ({reservations.length})
      </h2>

      {reservations.map(reservation => {
        // Get child display name based on RGPD consent
        const childName = reservation.child?.rgpd_consent_display_name
          ? reservation.child.prenom
          : 'Enfant (nom masqué)'
        const isRemplacement = !!reservation.date_fin

          // Group slots by day
        const slotsByDay = {}
        if (reservation.slots) {
          reservation.slots.forEach(slot => {
            if (!slotsByDay[slot.jour]) {
              slotsByDay[slot.jour] = []
            }
            slotsByDay[slot.jour].push(slot)
          })
        }

        return (
          <div
            key={reservation.id}
            className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {reservation.parent.prenom} {reservation.parent.nom}
                </h3>
                <p className="text-sm text-gray-600">{reservation.parent.email}</p>
                {isRemplacement && (
                  <p className="text-xs text-green-600 mt-1">Remplacement</p>
                )}
                {reservation.child && (
                  <p className="text-sm text-purple-600 font-medium mt-1">
                    👶 Pour : {childName}
                  </p>
                )}
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  reservation.statut === 'en_attente'
                    ? 'bg-yellow-100 text-yellow-800'
                    : reservation.statut === 'confirmee'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {reservation.statut === 'en_attente' && '⏳ En attente'}
                {reservation.statut === 'confirmee' && '✅ Confirmée'}
                {reservation.statut === 'annulee' && '❌ Annulée'}
              </span>
            </div>

            <div className={`grid gap-4 mb-4 ${isRemplacement ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div>
                <p className="text-sm text-gray-600">Début</p>
                <p className="font-semibold">
                  {format(new Date(reservation.date_debut), 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
              {isRemplacement && (
                <div>
                  <p className="text-sm text-gray-600">Fin</p>
                  <p className="font-semibold">
                    {format(new Date(reservation.date_fin), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
              )}
            </div>

            {/* Time slots by day */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Créneaux demandés :</p>
              {Object.keys(slotsByDay).length > 0 ? (
                <div className="space-y-2">
                  {JOURS.filter(jour => slotsByDay[jour]).map(jour => (
                    <div key={jour} className="flex items-center gap-2">
                      <span className="w-20 text-sm font-medium text-gray-700 capitalize">
                        {jour}
                      </span>
                      <div className="flex gap-1 flex-wrap">
                        {slotsByDay[jour].map((slot, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs"
                          >
                            {formatTime(slot.heure_debut)} - {formatTime(slot.heure_fin)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : reservation.jours_semaine ? (
                // Fallback for old reservations without slots
                <div className="flex gap-2 flex-wrap">
                  {reservation.jours_semaine.map(jour => (
                    <span
                      key={jour}
                      className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm capitalize"
                    >
                      {jour}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">Aucun créneau spécifié</p>
              )}
            </div>

            {/* Notes */}
            {reservation.notes && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Note :</span> {reservation.notes}
                </p>
              </div>
            )}

            {reservation.statut === 'en_attente' && (
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => updateStatut(reservation.id, 'confirmee')}
                  className="flex-1 bg-green-500 text-white py-2 rounded-lg font-semibold hover:bg-green-600 transition"
                >
                  ✓ Accepter
                </button>
                <button
                  onClick={() => updateStatut(reservation.id, 'annulee')}
                  className="flex-1 bg-red-500 text-white py-2 rounded-lg font-semibold hover:bg-red-600 transition"
                >
                  ✗ Refuser
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}