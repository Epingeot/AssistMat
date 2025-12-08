import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { format, differenceInMonths } from 'date-fns'
import { fr } from 'date-fns/locale'
import { logger } from '../../utils/logger'
import toast from 'react-hot-toast'
import { JOURS, formatTime } from '../../utils/scheduling'

export default function ReservationsList() {
  const { user } = useAuth()
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all', 'en_attente', 'confirmee', 'annulee'

  useEffect(() => {
    if (user) {
      loadReservations()
    }
  }, [user])

  const loadReservations = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          assistante:assistantes_maternelles!reservations_assistante_id_fkey(
            *,
            profile:profiles!assistantes_maternelles_user_id_fkey(nom, prenom)
          ),
          child:children(id, prenom),
          slots:reservation_slots(*)
        `)
        .eq('parent_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      logger.log('Reservations loaded:', data)
      setReservations(data || [])
    } catch (err) {
      logger.error('Error loading reservations:', err)
    } finally {
      setLoading(false)
    }
  }

  const cancelReservation = async (reservationId) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette réservation ?')) return

    try {
      const { error } = await supabase
        .from('reservations')
        .update({ statut: 'annulee' })
        .eq('id', reservationId)

      if (error) throw error
      
      await loadReservations()
    } catch (err) {
      logger.error('Error canceling reservation:', err)
      toast.error('Erreur lors de l\'annulation')
    }
  }

  const filteredReservations = filter === 'all' 
    ? reservations 
    : reservations.filter(r => r.statut === filter)

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-lg text-gray-600">Chargement...</div>
      </div>
    )
  }

  if (reservations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-6xl mb-4">📅</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          Aucune réservation
        </h3>
        <p className="text-gray-600">
          Vos demandes de réservation apparaîtront ici.
        </p>
      </div>
    )
  }

  const counts = {
    all: reservations.length,
    en_attente: reservations.filter(r => r.statut === 'en_attente').length,
    confirmee: reservations.filter(r => r.statut === 'confirmee').length,
    annulee: reservations.filter(r => r.statut === 'annulee').length,
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">
          Mes réservations
        </h2>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Toutes ({counts.all})
        </button>
        <button
          onClick={() => setFilter('en_attente')}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            filter === 'en_attente'
              ? 'bg-yellow-500 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          ⏳ En attente ({counts.en_attente})
        </button>
        <button
          onClick={() => setFilter('confirmee')}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            filter === 'confirmee'
              ? 'bg-green-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          ✅ Confirmées ({counts.confirmee})
        </button>
        <button
          onClick={() => setFilter('annulee')}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            filter === 'annulee'
              ? 'bg-red-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          ❌ Annulées ({counts.annulee})
        </button>
      </div>

      {/* Liste des réservations */}
      <div className="space-y-4">
        {filteredReservations.map(reservation => {
          const isRemplacement = !!reservation.date_fin
          const duree = isRemplacement
            ? differenceInMonths(new Date(reservation.date_fin), new Date(reservation.date_debut))
            : null

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
              className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                reservation.statut === 'en_attente' ? 'border-yellow-500' :
                reservation.statut === 'confirmee' ? 'border-green-500' :
                'border-red-500'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {reservation.assistante.profile.prenom} {reservation.assistante.profile.nom}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {reservation.assistante.adresse}, {reservation.assistante.ville}
                  </p>
                  {isRemplacement && (
                    <p className="text-xs text-green-600 mt-1">Remplacement</p>
                  )}
                  {reservation.child && (
                    <p className="text-sm text-blue-600 font-medium mt-1">
                      👶 Pour : {reservation.child.prenom}
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
                <p className="text-sm text-gray-600 mb-2">Créneaux réservés :</p>
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
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
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
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm capitalize font-medium"
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

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-gray-600">
                  {isRemplacement && (
                      <p>Durée : {duree} mois</p>
                  )}
                  <p>Demandé le {format(new Date(reservation.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}</p>
                </div>
                {reservation.statut === 'en_attente' && (
                  <button
                    onClick={() => cancelReservation(reservation.id)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-semibold"
                  >
                    Annuler la demande
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}