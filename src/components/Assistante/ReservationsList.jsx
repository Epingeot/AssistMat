import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { logger } from '../../utils/logger'
import toast from 'react-hot-toast'
import { JOURS, formatTime, getDayName, parseLocalDate, formatDuration, generateTimeOptions } from '../../utils/scheduling'
import MessageThread from '../Messaging/MessageThread'

const TERMINAL_STATUSES = ['finalisee', 'refusee', 'annulee']
const TIME_OPTIONS = generateTimeOptions('06:00', '22:00')
const normalizeTime = (t) => (t ? t.slice(0, 5) : '')

export default function ReservationsList() {
  const { user } = useAuth()
  const [reservations, setReservations] = useState([])
  const [workingHours, setWorkingHours] = useState({}) // { [jour]: { heure_debut, heure_fin } }
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('demande') // 'demande', 'finalisee', 'closed' (refusee + annulee)
  const [pendingAction, setPendingAction] = useState(null) // { reservationId, action: 'finalize' | 'refuse' }
  const [updating, setUpdating] = useState(false)
  const [sharingId, setSharingId] = useState(null) // reservationId currently being shared (for disabling the checkbox)

  const workingDayNums = Object.keys(workingHours).map(Number).sort((a, b) => a - b)

  // Options for the jour select: working days minus days already picked by other slots,
  // plus the current slot's own jour (even if outside working days, so it still displays).
  const jourOptionsFor = (current, takenByOthers = []) => {
    const taken = new Set(takenByOthers)
    const available = workingDayNums.filter(d => !taken.has(d))
    if (!available.includes(current)) return [...available, current].sort((a, b) => a - b)
    return available
  }

  // Options for heure_debut within a day's working window; include current if it falls outside
  const heureDebutOptionsFor = (jour, current) => {
    const wh = workingHours[jour]
    const base = wh
      ? TIME_OPTIONS.filter(t => t >= wh.heure_debut && t < wh.heure_fin)
      : TIME_OPTIONS.slice(0, -1)
    if (current && !base.includes(current)) return [...base, current].sort()
    return base
  }

  // Options for heure_fin strictly after heure_debut and within the day's working window
  const heureFinOptionsFor = (jour, heureDebut, current) => {
    const wh = workingHours[jour]
    const base = wh
      ? TIME_OPTIONS.filter(t => t > heureDebut && t <= wh.heure_fin)
      : TIME_OPTIONS.filter(t => t > heureDebut)
    if (current && !base.includes(current)) return [...base, current].sort()
    return base
  }

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

      // Load reservations + working hours in parallel
      const [reservationsResult, horairesResult] = await Promise.all([
        supabase
          .from('reservations')
          .select(`
            *,
            parent:profiles!reservations_parent_id_fkey(prenom, nom, email),
            child:children!reservations_child_id_fkey(id, prenom, rgpd_consent_display_name),
            slots:reservation_slots!reservation_slots_reservation_id_fkey(*)
          `)
          .eq('assistante_id', assistante.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('horaires_travail')
          .select('jour, heure_debut, heure_fin')
          .eq('assistante_id', assistante.id),
      ])

      if (reservationsResult.error) throw reservationsResult.error
      if (horairesResult.error) throw horairesResult.error

      const wh = {}
      for (const h of (horairesResult.data || [])) {
        wh[h.jour] = {
          heure_debut: normalizeTime(h.heure_debut),
          heure_fin: normalizeTime(h.heure_fin),
        }
      }
      setWorkingHours(wh)
      setReservations(reservationsResult.data || [])
    } catch (err) {
      logger.error('Error loading reservations:', err)
    } finally {
      setLoading(false)
    }
  }

  const confirmPendingAction = async () => {
    if (!pendingAction) return

    if (pendingAction.action === 'finalize') {
      // Validate edited form before persisting
      if (!pendingAction.dateDebut) {
        toast.error('Date de début requise')
        return
      }
      if (pendingAction.isRemplacement && !pendingAction.dateFin) {
        toast.error('Date de fin requise pour un remplacement')
        return
      }
      if (pendingAction.isRemplacement && pendingAction.dateFin < pendingAction.dateDebut) {
        toast.error('La date de fin doit être après la date de début')
        return
      }
      if (!pendingAction.slots || pendingAction.slots.length === 0) {
        toast.error('Au moins un créneau est requis')
        return
      }
      const seenDays = new Set()
      for (const s of pendingAction.slots) {
        if (seenDays.has(s.jour)) {
          toast.error(`Un seul créneau par jour (${JOURS[s.jour]} en double)`)
          return
        }
        seenDays.add(s.jour)
      }
      for (const s of pendingAction.slots) {
        if (!s.heure_debut || !s.heure_fin || s.heure_debut >= s.heure_fin) {
          toast.error('Chaque créneau doit avoir une heure de fin après l\'heure de début')
          return
        }
        const wh = workingHours[s.jour]
        if (workingDayNums.length > 0) {
          if (!wh) {
            toast.error(`${JOURS[s.jour]} n'est pas un jour de travail de votre planning`)
            return
          }
          if (s.heure_debut < wh.heure_debut || s.heure_fin > wh.heure_fin) {
            toast.error(`Les horaires du ${JOURS[s.jour]} doivent être entre ${formatTime(wh.heure_debut)} et ${formatTime(wh.heure_fin)}`)
            return
          }
        }
      }
    }

    setUpdating(true)
    try {
      if (pendingAction.action === 'finalize') {
        const { error: updErr } = await supabase
          .from('reservations')
          .update({
            statut: 'finalisee',
            date_debut: pendingAction.dateDebut,
            date_fin: pendingAction.isRemplacement ? pendingAction.dateFin : null,
          })
          .eq('id', pendingAction.reservationId)
        if (updErr) throw updErr

        // Replace slots: delete existing rows, then insert the edited set
        const { error: delErr } = await supabase
          .from('reservation_slots')
          .delete()
          .eq('reservation_id', pendingAction.reservationId)
        if (delErr) throw delErr

        const { error: insErr } = await supabase
          .from('reservation_slots')
          .insert(pendingAction.slots.map(s => ({
            reservation_id: pendingAction.reservationId,
            jour: s.jour,
            heure_debut: s.heure_debut,
            heure_fin: s.heure_fin,
          })))
        if (insErr) throw insErr

        toast.success('Mise en relation finalisée')
      } else {
        const { error } = await supabase
          .from('reservations')
          .update({ statut: 'refusee' })
          .eq('id', pendingAction.reservationId)
        if (error) throw error
        toast.success('Demande refusée')
      }

      setPendingAction(null)
      loadReservations()
    } catch (err) {
      logger.error('Error updating status:', err)
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setUpdating(false)
    }
  }

  const shareContact = async (reservationId) => {
    setSharingId(reservationId)
    try {
      const { error: updErr } = await supabase
        .from('reservations')
        .update({ contact_shared: true })
        .eq('id', reservationId)
      if (updErr) throw updErr

      const { error: msgErr } = await supabase
        .from('request_messages')
        .insert({
          reservation_id: reservationId,
          sender_id: user.id,
          body: "Je vous ai partagé mes coordonnées. Vous les retrouverez en haut de la demande — n'hésitez pas à me contacter directement pour échanger sur les détails !",
        })
      if (msgErr) throw msgErr

      setReservations(prev => prev.map(r =>
        r.id === reservationId ? { ...r, contact_shared: true } : r
      ))
      toast.success('Coordonnées partagées')
    } catch (err) {
      logger.error('Error sharing contact:', err)
      toast.error('Erreur lors du partage des coordonnées')
    } finally {
      setSharingId(null)
    }
  }

  const isClosed = (r) => r.statut === 'refusee' || r.statut === 'annulee'

  const filteredReservations = filter === 'closed'
      ? reservations.filter(isClosed)
      : reservations.filter(r => r.statut === filter)

  const counts = {
    demande: reservations.filter(r => r.statut === 'demande').length,
    finalisee: reservations.filter(r => r.statut === 'finalisee').length,
    closed: reservations.filter(isClosed).length,
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
        Demandes Reçues
      </h2>

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
          🚫 Refusées / Annulées ({counts.closed})
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
            className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
              reservation.statut === 'demande' ? 'border-primary' :
              reservation.statut === 'finalisee' ? 'border-success' :
              'border-error'
            }`}
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
            <div className="mb-4 pt-4 border-t border-hairline">
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
              <div className="mt-4 pt-4 border-t border-hairline space-y-3">
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={!!reservation.contact_shared}
                    disabled={!!reservation.contact_shared || sharingId === reservation.id}
                    onChange={(e) => { if (e.target.checked) shareContact(reservation.id) }}
                    className="w-4 h-4 accent-primary cursor-pointer disabled:cursor-not-allowed"
                  />
                  <span className={reservation.contact_shared ? 'text-success font-semibold' : 'text-ink'}>
                    {reservation.contact_shared
                      ? '✅ Coordonnées partagées avec le parent'
                      : 'Partager mes coordonnées (adresse, téléphone, email) avec le parent'}
                  </span>
                </label>

                <div className="flex gap-3">
                  <button
                    onClick={() => setPendingAction({
                      reservationId: reservation.id,
                      action: 'finalize',
                      dateDebut: reservation.date_debut || '',
                      dateFin: reservation.date_fin || '',
                      isRemplacement: !!reservation.is_remplacement,
                      slots: (reservation.slots || [])
                        .map(s => ({
                          jour: s.jour,
                          heure_debut: normalizeTime(s.heure_debut),
                          heure_fin: normalizeTime(s.heure_fin),
                        }))
                        .sort((a, b) => a.jour - b.jour || a.heure_debut.localeCompare(b.heure_debut)),
                    })}
                    className="flex-1 bg-success text-white py-2 rounded-lg font-semibold hover:bg-success/90 transition"
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
            className={`bg-white rounded-lg shadow-xl w-full ${
              pendingAction.action === 'finalize' ? 'max-w-2xl' : 'max-w-md'
            } max-h-[90vh] flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-hairline bg-soft">
              <h3 className="text-lg font-bold text-ink">
                {pendingAction.action === 'finalize'
                  ? 'Finaliser la mise en relation'
                  : 'Refuser la demande'}
              </h3>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {pendingAction.action === 'finalize' ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted">
                    Vérifiez et ajustez les dates et les créneaux avant de finaliser.
                    La mise en relation sera ajoutée à votre planning et le parent verra vos coordonnées.
                  </p>

                  <div className={`grid gap-4 ${pendingAction.isRemplacement ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <div>
                      <label className="block text-sm font-medium text-ink mb-1">Date de début</label>
                      <input
                        type="date"
                        value={pendingAction.dateDebut || ''}
                        onChange={(e) => setPendingAction({ ...pendingAction, dateDebut: e.target.value })}
                        className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    {pendingAction.isRemplacement && (
                      <div>
                        <label className="block text-sm font-medium text-ink mb-1">Date de fin</label>
                        <input
                          type="date"
                          value={pendingAction.dateFin || ''}
                          onChange={(e) => setPendingAction({ ...pendingAction, dateFin: e.target.value })}
                          className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-ink">Créneaux</label>
                      <button
                        type="button"
                        disabled={
                          workingDayNums.length === 0 ||
                          workingDayNums.every(d => pendingAction.slots.some(s => s.jour === d))
                        }
                        onClick={() => {
                          const used = new Set(pendingAction.slots.map(s => s.jour))
                          const firstFree = workingDayNums.find(d => !used.has(d))
                          if (firstFree === undefined) return
                          const wh = workingHours[firstFree]
                          setPendingAction({
                            ...pendingAction,
                            slots: [...pendingAction.slots, {
                              jour: firstFree,
                              heure_debut: wh?.heure_debut || '08:00',
                              heure_fin: wh?.heure_fin || '18:00',
                            }],
                          })
                        }}
                        className="text-sm text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                      >
                        + Ajouter un créneau
                      </button>
                    </div>

                    {workingDayNums.length === 0 && (
                      <p className="text-xs text-warning italic mb-2">
                        Aucun horaire de travail défini sur votre profil. Renseignez votre planning pour proposer des créneaux.
                      </p>
                    )}

                    {pendingAction.slots.length === 0 ? (
                      <p className="text-sm text-muted italic">Aucun créneau. Ajoutez-en un.</p>
                    ) : (
                      <div className="space-y-2">
                        {pendingAction.slots.map((slot, idx) => {
                          const hdOptions = heureDebutOptionsFor(slot.jour, slot.heure_debut)
                          const hfOptions = heureFinOptionsFor(slot.jour, slot.heure_debut, slot.heure_fin)
                          const takenByOthers = pendingAction.slots
                            .filter((_, i) => i !== idx)
                            .map(s => s.jour)
                          const jOptions = jourOptionsFor(slot.jour, takenByOthers)
                          return (
                            <div key={idx} className="flex items-center gap-2 flex-wrap">
                              <select
                                value={slot.jour}
                                onChange={(e) => {
                                  const newJour = Number(e.target.value)
                                  const slots = [...pendingAction.slots]
                                  const wh = workingHours[newJour]
                                  let heure_debut = slot.heure_debut
                                  let heure_fin = slot.heure_fin
                                  // Clamp times to the new day's working window
                                  if (wh) {
                                    if (heure_debut < wh.heure_debut || heure_debut >= wh.heure_fin) {
                                      heure_debut = wh.heure_debut
                                    }
                                    if (heure_fin > wh.heure_fin || heure_fin <= heure_debut) {
                                      heure_fin = wh.heure_fin
                                    }
                                  }
                                  slots[idx] = { ...slot, jour: newJour, heure_debut, heure_fin }
                                  setPendingAction({ ...pendingAction, slots })
                                }}
                                className="px-2 py-1 border border-line rounded text-sm capitalize bg-white"
                              >
                                {jOptions.map(i => (
                                  <option key={i} value={i}>{JOURS[i]}</option>
                                ))}
                              </select>
                              <select
                                value={slot.heure_debut}
                                onChange={(e) => {
                                  const newHD = e.target.value
                                  const slots = [...pendingAction.slots]
                                  const wh = workingHours[slot.jour]
                                  let heure_fin = slot.heure_fin
                                  // Ensure heure_fin stays strictly after heure_debut and within the day
                                  if (heure_fin <= newHD) {
                                    heure_fin = wh ? wh.heure_fin : '22:00'
                                  }
                                  slots[idx] = { ...slot, heure_debut: newHD, heure_fin }
                                  setPendingAction({ ...pendingAction, slots })
                                }}
                                className="px-2 py-1 border border-line rounded text-sm bg-white"
                              >
                                {hdOptions.map(t => <option key={t} value={t}>{formatTime(t)}</option>)}
                              </select>
                              <span className="text-sm text-muted">→</span>
                              <select
                                value={slot.heure_fin}
                                onChange={(e) => {
                                  const slots = [...pendingAction.slots]
                                  slots[idx] = { ...slot, heure_fin: e.target.value }
                                  setPendingAction({ ...pendingAction, slots })
                                }}
                                className="px-2 py-1 border border-line rounded text-sm bg-white"
                              >
                                {hfOptions.map(t => <option key={t} value={t}>{formatTime(t)}</option>)}
                              </select>
                              <button
                                type="button"
                                onClick={() => setPendingAction({
                                  ...pendingAction,
                                  slots: pendingAction.slots.filter((_, i) => i !== idx),
                                })}
                                className="ml-auto px-2 py-1 text-error hover:bg-error/10 rounded text-sm"
                                aria-label="Supprimer ce créneau"
                              >
                                ✕
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-ink">
                  Cette action est définitive. Le fil de discussion sera fermé.
                </p>
              )}
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