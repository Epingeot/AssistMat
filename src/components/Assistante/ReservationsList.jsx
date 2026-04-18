import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { logger } from '../../utils/logger'
import toast from 'react-hot-toast'
import { JOURS, formatTime, getDayName, parseLocalDate, formatDuration } from '../../utils/scheduling'

export default function ReservationsList() {
  const { user } = useAuth()
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('en_attente') // Default to pending - 'all', 'en_attente', 'confirmee', 'annulee'
  const [respondingTo, setRespondingTo] = useState(null) // {reservationId, action: 'accept' | 'deny'}
  const [responseMessage, setResponseMessage] = useState('')

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

  const updateStatut = async (reservationId, newStatut, message = '') => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({
          statut: newStatut,
          assistante_response: message.trim() || null,
          responded_at: new Date().toISOString()
        })
        .eq('id', reservationId)

      if (error) throw error

      toast.success(newStatut === 'confirmee' ? 'Réservation acceptée' : 'Réservation refusée')
      setRespondingTo(null)
      setResponseMessage('')

      // Recharger
      loadReservations()
    } catch (err) {
      logger.error('Error updating status:', err)
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleResponse = (reservationId, action) => {
    setRespondingTo({ reservationId, action })
    setResponseMessage('')
  }

  const confirmResponse = () => {
    if (!respondingTo) return
    const newStatut = respondingTo.action === 'accept' ? 'confirmee' : 'annulee'
    updateStatut(respondingTo.reservationId, newStatut, responseMessage)
  }

  const filteredReservations = filter === 'all'
    ? reservations
    : reservations.filter(r => r.statut === filter)

  const counts = {
    all: reservations.length,
    en_attente: reservations.filter(r => r.statut === 'en_attente').length,
    confirmee: reservations.filter(r => r.statut === 'confirmee').length,
    annulee: reservations.filter(r => r.statut === 'annulee').length,
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
      <h2 className="text-2xl font-bold text-gray-800">
        Demandes de réservation
      </h2>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('en_attente')}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            filter === 'en_attente'
              ? 'bg-warning text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          ⏳ En attente ({counts.en_attente})
        </button>
        <button
          onClick={() => setFilter('confirmee')}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            filter === 'confirmee'
              ? 'bg-accent text-text-base'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          ✅ Confirmées ({counts.confirmee})
        </button>
        <button
          onClick={() => setFilter('annulee')}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            filter === 'annulee'
              ? 'bg-error text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          ❌ Refusées ({counts.annulee})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            filter === 'all'
              ? 'bg-primary text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Toutes ({counts.all})
        </button>
      </div>

      {/* Empty state for filtered results */}
      {filteredReservations.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-600">
            {filter === 'en_attente' && 'Aucune demande en attente'}
            {filter === 'confirmee' && 'Aucune réservation confirmée'}
            {filter === 'annulee' && 'Aucune réservation refusée'}
            {filter === 'all' && 'Aucune réservation'}
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
                <h3 className="text-lg font-bold text-gray-800">
                  {reservation.parent.prenom} {reservation.parent.nom}
                </h3>
                <p className="text-sm text-gray-600">{reservation.parent.email}</p>
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
                  reservation.statut === 'en_attente'
                    ? 'bg-warning/20 text-warning'
                    : reservation.statut === 'confirmee'
                    ? 'bg-success/20 text-text-base'
                    : 'bg-error/20 text-error'
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
                  {format(parseLocalDate(reservation.date_debut), 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
              {isRemplacement && (
                <div>
                  <p className="text-sm text-gray-600">Fin</p>
                  <p className="font-semibold">
                    {format(parseLocalDate(reservation.date_fin), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                  <p className="text-sm text-gray-600">Durée : {duree}</p>
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
                <p className="text-sm text-gray-500 italic">Aucun créneau spécifié</p>
              )}
            </div>

            {/* Chat-style messages */}
            {(reservation.notes || reservation.assistante_response) && (
              <div className="mb-4 space-y-2">
                {/* Parent message - left side (received) */}
                {reservation.notes && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] p-3 bg-gray-100 text-gray-800 rounded-2xl rounded-bl-md">
                      <p className="text-sm">{reservation.notes}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {reservation.parent.prenom} · {format(new Date(reservation.created_at), 'dd/MM à HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                )}
                {/* Assistante response - right side (sent by me) */}
                {reservation.assistante_response && (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] p-3 bg-primary text-white rounded-2xl rounded-br-md">
                      <p className="text-sm">{reservation.assistante_response}</p>
                      <p className="text-xs text-white/70 mt-1 text-right">
                        Vous · {format(new Date(reservation.responded_at), 'dd/MM à HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {reservation.statut === 'en_attente' && (
              respondingTo?.reservationId === reservation.id ? (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message pour le parent (optionnel)
                  </label>
                  <textarea
                    value={responseMessage}
                    onChange={(e) => setResponseMessage(e.target.value)}
                    placeholder={
                      respondingTo.action === 'accept'
                        ? "Ex: Parfait! Appelez-moi pour finaliser les détails..."
                        : "Ex: Désolée, ces horaires ne correspondent pas à ma disponibilité..."
                    }
                    rows={3}
                    maxLength={300}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary resize-none text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1 mb-3">
                    {responseMessage.length}/300 caractères
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={confirmResponse}
                      className={`flex-1 py-2 rounded-lg font-semibold transition ${
                        respondingTo.action === 'accept'
                          ? 'bg-success hover:bg-success/90 text-text-base'
                          : 'bg-error hover:bg-error/90 text-white'
                      }`}
                    >
                      {respondingTo.action === 'accept' ? '✓ Confirmer acceptation' : '✗ Confirmer refus'}
                    </button>
                    <button
                      onClick={() => {
                        setRespondingTo(null)
                        setResponseMessage('')
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => handleResponse(reservation.id, 'accept')}
                    className="flex-1 bg-success text-text-base py-2 rounded-lg font-semibold hover:bg-success/90 transition"
                  >
                    ✓ Accepter
                  </button>
                  <button
                    onClick={() => handleResponse(reservation.id, 'deny')}
                    className="flex-1 bg-error text-white py-2 rounded-lg font-semibold hover:bg-error/90 transition"
                  >
                    ✗ Refuser
                  </button>
                </div>
              )
            )}
          </div>
        )
      })}
    </div>
  )
}