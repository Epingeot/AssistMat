import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import {
  JOURS,
  JOURS_COURTS,
  generateTimeSlots,
  formatTime,
  formatDateForDB,
  timeToMinutes,
  getToday,
  parseLocalDate,
  formatDuration
} from '../../utils/scheduling'
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

/**
 * AvailabilityCalendar - Weekly calendar showing time slots
 *
 * Props:
 * - assistanteId: UUID of the assistante
 * - mode: 'view' (read-only) or 'select' (for booking)
 * - selectedSlots: Array of selected slots (for select mode)
 * - onSlotSelect: Callback when a slot is clicked (for select mode)
 * - weekStartDate: Starting date for the week view
 * - onWeekChange: Callback when week changes
 * - showChildNames: Whether to show child names on booked slots (default true)
 */
export default function AvailabilityCalendar({
  assistanteId,
  mode = 'view',
  selectedSlots = [],
  onSlotSelect,
  weekStartDate: externalWeekStart,
  onWeekChange,
  showChildNames = true
}) {
  // Internal week state if not controlled externally
  const [internalWeekStart, setInternalWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday
  )

  const weekStart = externalWeekStart || internalWeekStart

  const [schedule, setSchedule] = useState([]) // horaires_travail
  const [bookedSlots, setBookedSlots] = useState([]) // confirmed reservations for this week
  const [pendingSlots, setPendingSlots] = useState([]) // pending reservations for this week
  const [loading, setLoading] = useState(true)
  const [vacationWeeks, setVacationWeeks] = useState(5)
  const [maxKids, setMaxKids] = useState(4)
  const [selectedSlot, setSelectedSlot] = useState(null) // For preview modal
  const [selectedReservation, setSelectedReservation] = useState(null) // For detail/edit modal
  const [editingEndDate, setEditingEndDate] = useState('') // For editing end date
  const [savingEndDate, setSavingEndDate] = useState(false)

  // Generate array of 7 dates for the current week
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }, [weekStart])

  // Load schedule and bookings
  useEffect(() => {
    if (assistanteId) {
      loadData()
    }
  }, [assistanteId, weekStart])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load assistante's schedule
      const { data: horaires } = await supabase
        .from('horaires_travail')
        .select('jour, heure_debut, heure_fin')
        .eq('assistante_id', assistanteId)

      if (horaires) {
        setSchedule(horaires)
      }

      // Load assistante's vacation weeks and max kids
      const { data: assistante } = await supabase
        .from('assistantes_maternelles')
        .select('vacation_weeks, max_kids')
        .eq('id', assistanteId)
        .single()

      if (assistante) {
        setVacationWeeks(assistante.vacation_weeks || 5)
        setMaxKids(assistante.max_kids || 4)
      }

      // Load all reservations (confirmed and pending) for this assistante
      const { data: reservations } = await supabase
        .from('reservations')
        .select(`
          id,
          statut,
          date_debut,
          date_fin,
          notes,
          child:children!reservations_child_id_fkey(
            prenom,
            rgpd_consent_display_name
          ),
          parent:profiles!reservations_parent_id_fkey(
            prenom,
            nom,
            email
          ),
          reservation_slots!reservation_slots_reservation_id_fkey(
            jour,
            heure_debut,
            heure_fin
          )
        `)
        .eq('assistante_id', assistanteId)
        .in('statut', ['confirmee', 'en_attente'])

      if (reservations) {
        const bookedForWeek = []
        const pendingForWeek = []

        reservations.forEach(reservation => {
          const resStart = new Date(reservation.date_debut)
          const resEnd = reservation.date_fin ? new Date(reservation.date_fin) : null

          weekDates.forEach((date, dayIndex) => {
            // Check if this date falls within the reservation period
            if (date >= resStart && (!resEnd || date <= resEnd)) {
              reservation.reservation_slots?.forEach(slot => {
                if (slot.jour === dayIndex) {
                  const slotData = {
                    date: formatDateForDB(date),
                    heure_debut: slot.heure_debut,
                    heure_fin: slot.heure_fin,
                    reservation_id: reservation.id,
                    statut: reservation.statut,
                    child: reservation.child,
                    parent: reservation.parent,
                    notes: reservation.notes,
                    date_debut: reservation.date_debut,
                    date_fin: reservation.date_fin
                  }

                  if (reservation.statut === 'confirmee') {
                    bookedForWeek.push(slotData)
                  } else {
                    pendingForWeek.push(slotData)
                  }
                }
              })
            }
          })
        })

        setBookedSlots(bookedForWeek)
        setPendingSlots(pendingForWeek)
      }

    } catch (err) {
      console.error('Error loading calendar data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Navigate weeks
  const goToPreviousWeek = () => {
    const newStart = subWeeks(weekStart, 1)
    if (onWeekChange) {
      onWeekChange(newStart)
    } else {
      setInternalWeekStart(newStart)
    }
  }

  const goToNextWeek = () => {
    const newStart = addWeeks(weekStart, 1)
    if (onWeekChange) {
      onWeekChange(newStart)
    } else {
      setInternalWeekStart(newStart)
    }
  }

  const goToToday = () => {
    const newStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    if (onWeekChange) {
      onWeekChange(newStart)
    } else {
      setInternalWeekStart(newStart)
    }
  }

  // Open reservation detail modal
  const openReservationDetail = (reservation) => {
    setSelectedReservation(reservation)
    setEditingEndDate(reservation.date_fin || '')
    setSelectedSlot(null) // Close the slot preview modal
  }

  // Save end date for a reservation
  const saveEndDate = async () => {
    if (!selectedReservation) return

    setSavingEndDate(true)
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ date_fin: editingEndDate || null })
        .eq('id', selectedReservation.reservation_id)

      if (error) throw error

      toast.success('Date de fin mise à jour')
      setSelectedReservation(null)
      loadData() // Refresh calendar data
    } catch (err) {
      console.error('Error saving end date:', err)
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSavingEndDate(false)
    }
  }

  // Get working hours for a specific day (0-6)
  const getWorkingHoursForDay = (dayIndex) => {
    const daySchedule = schedule.find(s => s.jour === dayIndex)
    if (!daySchedule) return null
    return {
      start: daySchedule.heure_debut,
      end: daySchedule.heure_fin
    }
  }

  // Get all booked slots for a specific time
  const getBookedSlots = (date, timeStart, timeEnd) => {
    const dateStr = formatDateForDB(date)
    return bookedSlots.filter(slot =>
      slot.date === dateStr &&
      timeToMinutes(slot.heure_debut) <= timeToMinutes(timeStart) &&
      timeToMinutes(slot.heure_fin) >= timeToMinutes(timeEnd)
    )
  }

  // Get all pending slots for a specific time
  const getPendingSlots = (date, timeStart, timeEnd) => {
    const dateStr = formatDateForDB(date)
    return pendingSlots.filter(slot =>
      slot.date === dateStr &&
      timeToMinutes(slot.heure_debut) <= timeToMinutes(timeStart) &&
      timeToMinutes(slot.heure_fin) >= timeToMinutes(timeEnd)
    )
  }

  // Get all reservations (booked + pending) for a specific time
  const getAllReservations = (date, timeStart, timeEnd) => {
    return [
      ...getBookedSlots(date, timeStart, timeEnd),
      ...getPendingSlots(date, timeStart, timeEnd)
    ]
  }

  // Check if a slot is selected (for select mode)
  const isSelected = (dayIndex, timeStart, timeEnd) => {
    return selectedSlots.some(slot =>
      slot.jour === dayIndex &&
      slot.heure_debut === timeStart &&
      slot.heure_fin === timeEnd
    )
  }

  // Handle slot click
  const handleSlotClick = (dayIndex, timeStart, timeEnd, date) => {
    const allReservations = getAllReservations(date, timeStart, timeEnd)

    // If there are reservations, show preview modal
    if (allReservations.length > 0) {
      setSelectedSlot({
        date,
        dayIndex,
        timeStart,
        timeEnd,
        reservations: allReservations
      })
      return
    }

    // For select mode, allow selecting empty slots
    if (mode === 'select' && onSlotSelect) {
      onSlotSelect({
        jour: dayIndex,
        heure_debut: timeStart,
        heure_fin: timeEnd
      })
    }
  }

  // Generate all time slots for display (6:00 to 22:00)
  const allTimeSlots = useMemo(() => generateTimeSlots('06:00', '22:00'), [])

  // Find the earliest and latest working hours to optimize display
  const displayRange = useMemo(() => {
    if (schedule.length === 0) {
      return { start: '08:00', end: '18:00' }
    }

    let earliest = '22:00'
    let latest = '06:00'

    schedule.forEach(day => {
      if (day.heure_debut < earliest) earliest = day.heure_debut
      if (day.heure_fin > latest) latest = day.heure_fin
    })

    // Add some padding
    const earliestMin = Math.max(timeToMinutes(earliest) - 60, timeToMinutes('06:00'))
    const latestMin = Math.min(timeToMinutes(latest) + 60, timeToMinutes('22:00'))

    return {
      start: `${String(Math.floor(earliestMin / 60)).padStart(2, '0')}:00`,
      end: `${String(Math.ceil(latestMin / 60)).padStart(2, '0')}:00`
    }
  }, [schedule])

  // Filter time slots to display range
  const displaySlots = useMemo(() => {
    return allTimeSlots.filter(slot =>
      timeToMinutes(slot.start) >= timeToMinutes(displayRange.start) &&
      timeToMinutes(slot.end) <= timeToMinutes(displayRange.end)
    )
  }, [allTimeSlots, displayRange])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted">Chargement du calendrier...</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-hairline overflow-hidden">
      {/* Header with navigation */}
      <div className="flex items-center justify-between p-4 border-b border-hairline bg-soft">
        <button
          onClick={goToPreviousWeek}
          className="p-2 hover:bg-chip rounded-lg transition"
          title="Semaine précédente"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-4">
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition"
          >
            Aujourd'hui
          </button>
          <h3 className="text-lg font-semibold text-ink">
            {format(weekStart, 'd MMM', { locale: fr })} - {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: fr })}
          </h3>
        </div>

        <button
          onClick={goToNextWeek}
          className="p-2 hover:bg-chip rounded-lg transition"
          title="Semaine suivante"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 p-3 border-b border-hairline text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-success/10 border border-success/30 rounded"></div>
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-primary/30 rounded"></div>
          <span>25% plein</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-primary/50 rounded"></div>
          <span>50% plein</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-primary/70 rounded"></div>
          <span>75% plein</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-primary rounded"></div>
          <span>Complet</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-chip border border-hairline rounded"></div>
          <span>Non travaillé</span>
        </div>
        {mode === 'select' && (
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-secondary rounded"></div>
            <span>Sélectionné</span>
          </div>
        )}
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[700px]">
          <thead>
            <tr>
              <th className="w-16 p-2 text-xs text-muted border-r border-hairline bg-soft">
                Heure
              </th>
              {weekDates.map((date, index) => {
                const isToday = formatDateForDB(date) === formatDateForDB(getToday())
                const workingHours = getWorkingHoursForDay(index)
                return (
                  <th
                    key={index}
                    className={`p-2 text-center border-r border-hairline ${
                      isToday ? 'bg-primary/10' : 'bg-soft'
                    } ${!workingHours ? 'opacity-50' : ''}`}
                  >
                    <div className={`text-sm font-medium capitalize ${isToday ? 'text-primary' : 'text-ink'}`}>
                      {JOURS_COURTS[index]}
                    </div>
                    <div className={`text-xs ${isToday ? 'text-primary' : 'text-muted'}`}>
                      {format(date, 'd MMM', { locale: fr })}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {displaySlots.map((timeSlot, slotIndex) => (
              <tr key={slotIndex} className="border-t border-hairline">
                <td className="p-1 text-xs text-muted text-center border-r border-hairline bg-soft">
                  {formatTime(timeSlot.start)}
                </td>
                {weekDates.map((date, dayIndex) => {
                  const workingHours = getWorkingHoursForDay(dayIndex)
                  const isWorking = workingHours &&
                    timeToMinutes(timeSlot.start) >= timeToMinutes(workingHours.start) &&
                    timeToMinutes(timeSlot.end) <= timeToMinutes(workingHours.end)

                  const bookedSlotsForTime = getBookedSlots(date, timeSlot.start, timeSlot.end)
                  const pendingSlotsForTime = getPendingSlots(date, timeSlot.start, timeSlot.end)
                  const totalReservations = bookedSlotsForTime.length + pendingSlotsForTime.length
                  const capacityPercent = totalReservations / maxKids

                  const selected = mode === 'select' && isSelected(dayIndex, timeSlot.start, timeSlot.end)
                  const isToday = formatDateForDB(date) === formatDateForDB(getToday())
                  const isPast = date < new Date() && !isToday
                  const isFull = totalReservations >= maxKids

                  let cellClass = 'h-8 border-r border-hairline transition-colors relative '
                  let content = null

                  if (!isWorking) {
                    // Non-working hours
                    cellClass += 'bg-chip'
                  } else if (totalReservations > 0) {
                    // Has reservations - show capacity gradient
                    cellClass += 'cursor-pointer '

                    // Color gradient based on capacity
                    if (capacityPercent <= 0.25) {
                      cellClass += 'bg-primary/30'
                    } else if (capacityPercent <= 0.5) {
                      cellClass += 'bg-primary/50'
                    } else if (capacityPercent <= 0.75) {
                      cellClass += 'bg-primary/70'
                    } else {
                      cellClass += 'bg-primary'
                    }

                    // Dots indicator
                    content = (
                      <div className="flex items-center justify-center gap-0.5 h-full">
                        {Array.from({ length: maxKids }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${
                              i < totalReservations ? 'bg-white' : 'bg-white/30'
                            }`}
                          />
                        ))}
                      </div>
                    )
                  } else if (selected) {
                    // Selected (in select mode)
                    cellClass += 'bg-secondary cursor-pointer'
                  } else if (isPast) {
                    // Past slots
                    cellClass += 'bg-chip'
                  } else {
                    // Available
                    cellClass += 'bg-success/10 hover:bg-success/20'
                    if (mode === 'select') {
                      cellClass += ' cursor-pointer'
                    }
                  }

                  return (
                    <td
                      key={dayIndex}
                      className={cellClass}
                      onClick={() => isWorking && !isPast && handleSlotClick(dayIndex, timeSlot.start, timeSlot.end, date)}
                      title={
                        !isWorking ? 'Non travaillé' :
                        totalReservations > 0 ? `${totalReservations}/${maxKids} places réservées - Cliquez pour détails` :
                        selected ? 'Sélectionné' :
                        isPast ? 'Passé' :
                        'Disponible'
                      }
                    >
                      {content}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary for select mode */}
      {mode === 'select' && selectedSlots.length > 0 && (
        <div className="p-4 border-t border-hairline bg-secondary/10">
          <p className="text-sm text-secondary">
            <strong>{selectedSlots.length}</strong> créneau{selectedSlots.length > 1 ? 'x' : ''} sélectionné{selectedSlots.length > 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Reservation Preview Modal */}
      {selectedSlot && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedSlot(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-hairline bg-soft">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-ink">
                    Réservations - {JOURS[selectedSlot.dayIndex]}
                  </h3>
                  <p className="text-sm text-muted">
                    {format(selectedSlot.date, 'd MMMM yyyy', { locale: fr })}
                  </p>
                  <p className="text-sm text-muted">
                    {formatTime(selectedSlot.timeStart)} - {formatTime(selectedSlot.timeEnd)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSlot(null)}
                  className="text-subtle hover:text-muted transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-2 text-sm font-semibold text-ink">
                Capacité: {selectedSlot.reservations.length}/{maxKids}
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {selectedSlot.reservations.map((reservation, idx) => {
                const childName = reservation.child?.rgpd_consent_display_name
                  ? reservation.child.prenom
                  : 'Nom masqué (RGPD)'

                return (
                  <div
                    key={idx}
                    onClick={() => mode === 'view' && openReservationDetail(reservation)}
                    className={`p-4 rounded-lg border-2 ${
                      reservation.statut === 'confirmee'
                        ? 'border-success/40 bg-success/10'
                        : 'border-warning/40 bg-warning/10'
                    } ${mode === 'view' ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-ink">
                        {idx + 1}. {childName}
                      </h4>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          reservation.statut === 'confirmee'
                            ? 'bg-success/20 text-ink'
                            : 'bg-warning/20 text-warning'
                        }`}
                      >
                        {reservation.statut === 'confirmee' ? '✅ Confirmée' : '⏳ En attente'}
                      </span>
                    </div>

                    {reservation.parent && (
                      <div className="text-sm text-ink space-y-1">
                        <p>
                          <span className="font-medium">Parent:</span>{' '}
                          {reservation.parent.prenom} {reservation.parent.nom}
                        </p>
                      </div>
                    )}

                    {/* Show dates */}
                    <div className="text-sm text-muted mt-2">
                      <p>
                        <span className="font-medium">Début:</span>{' '}
                        {format(parseLocalDate(reservation.date_debut), 'd MMM yyyy', { locale: fr })}
                      </p>
                      {reservation.date_fin && (
                        <p>
                          <span className="font-medium">Fin:</span>{' '}
                          {format(parseLocalDate(reservation.date_fin), 'd MMM yyyy', { locale: fr })}
                        </p>
                      )}
                    </div>

                    {mode === 'view' && (
                      <p className="text-xs text-primary mt-2 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Cliquez pour voir les détails
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-hairline bg-soft">
              <div className="flex justify-between items-center text-sm text-muted">
                <span>
                  {selectedSlot.reservations.length === maxKids
                    ? 'Créneau complet'
                    : `${maxKids - selectedSlot.reservations.length} place(s) disponible(s)`}
                </span>
                <button
                  onClick={() => setSelectedSlot(null)}
                  className="px-4 py-2 border border-line text-ink rounded-lg hover:bg-soft transition"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reservation Detail/Edit Modal */}
      {selectedReservation && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedReservation(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-hairline bg-primary/10">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-ink">
                    Détails de la réservation
                  </h3>
                  <span
                    className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-semibold ${
                      selectedReservation.statut === 'confirmee'
                        ? 'bg-success/20 text-ink'
                        : 'bg-warning/20 text-warning'
                    }`}
                  >
                    {selectedReservation.statut === 'confirmee' ? '✅ Confirmée' : '⏳ En attente'}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedReservation(null)}
                  className="text-subtle hover:text-muted transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* Child info */}
              <div>
                <h4 className="text-sm font-semibold text-muted uppercase tracking-wide mb-1">Enfant</h4>
                <p className="text-lg font-semibold text-ink">
                  {selectedReservation.child?.rgpd_consent_display_name
                    ? selectedReservation.child.prenom
                    : 'Nom masqué (RGPD)'}
                </p>
              </div>

              {/* Parent info */}
              {selectedReservation.parent && (
                <div>
                  <h4 className="text-sm font-semibold text-muted uppercase tracking-wide mb-1">Parent</h4>
                  <p className="text-ink">
                    {selectedReservation.parent.prenom} {selectedReservation.parent.nom}
                  </p>
                  {selectedReservation.parent.email && (
                    <a
                      href={`mailto:${selectedReservation.parent.email}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {selectedReservation.parent.email}
                    </a>
                  )}
                </div>
              )}

              {/* Dates */}
              <div className="bg-soft rounded-lg p-4">
                <h4 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Période</h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-muted mb-1">Date de début</label>
                    <p className="font-semibold text-ink">
                      {format(parseLocalDate(selectedReservation.date_debut), 'd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-muted mb-1">
                      Date de fin
                      <span className="text-xs text-subtle ml-1">(modifiable)</span>
                    </label>
                    <input
                      type="date"
                      value={editingEndDate}
                      onChange={(e) => setEditingEndDate(e.target.value)}
                      min={selectedReservation.date_debut}
                      className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                    {!editingEndDate && (
                      <p className="text-xs text-muted mt-1">
                        Contrat permanent (pas de date de fin définie)
                      </p>
                    )}
                  </div>

                  {editingEndDate && selectedReservation.date_debut && (
                    <div className="text-sm text-muted">
                      <span className="font-medium">Durée:</span>{' '}
                      {formatDuration(parseLocalDate(selectedReservation.date_debut), parseLocalDate(editingEndDate))}
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedReservation.notes && (
                <div>
                  <h4 className="text-sm font-semibold text-muted uppercase tracking-wide mb-1">Note du parent</h4>
                  <p className="text-ink bg-soft p-3 rounded-lg text-sm">
                    {selectedReservation.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-hairline bg-soft flex justify-end gap-3">
              <button
                onClick={() => setSelectedReservation(null)}
                className="px-4 py-2 text-ink bg-white border border-line rounded-lg hover:bg-soft transition"
              >
                Annuler
              </button>
              <button
                onClick={saveEndDate}
                disabled={savingEndDate}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
              >
                {savingEndDate ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
