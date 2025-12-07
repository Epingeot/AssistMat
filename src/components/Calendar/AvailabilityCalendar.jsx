import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import {
  JOURS,
  JOURS_COURTS,
  generateTimeSlots,
  formatTime,
  timeToMinutes
} from '../../utils/scheduling'
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns'
import { fr } from 'date-fns/locale'

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
  const [bookedSlots, setBookedSlots] = useState([]) // booked_slots for this week
  const [pendingSlots, setPendingSlots] = useState([]) // pending reservations
  const [loading, setLoading] = useState(true)
  const [vacationWeeks, setVacationWeeks] = useState(5)

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

      // Load assistante's vacation weeks
      const { data: assistante } = await supabase
        .from('assistantes_maternelles')
        .select('vacation_weeks')
        .eq('id', assistanteId)
        .single()

      if (assistante) {
        setVacationWeeks(assistante.vacation_weeks || 5)
      }

      // Load booked slots for this week (confirmed reservations)
      const weekEnd = addDays(weekStart, 6)
      const { data: booked } = await supabase
        .from('booked_slots')
        .select(`
          id,
          date,
          heure_debut,
          heure_fin,
          child_id,
          children (
            prenom,
            rgpd_consent_display_name
          )
        `)
        .eq('assistante_id', assistanteId)
        .gte('date', format(weekStart, 'yyyy-MM-dd'))
        .lte('date', format(weekEnd, 'yyyy-MM-dd'))

      if (booked) {
        setBookedSlots(booked)
      }

      // Load pending reservation slots for this week
      const { data: pending } = await supabase
        .from('reservations')
        .select(`
          id,
          date_debut,
          date_fin,
          reservation_slots (
            jour,
            heure_debut,
            heure_fin
          )
        `)
        .eq('assistante_id', assistanteId)
        .eq('statut', 'en_attente')

      if (pending) {
        // Filter and expand pending slots for this week
        const pendingForWeek = []
        pending.forEach(reservation => {
          const resStart = new Date(reservation.date_debut)
          const resEnd = new Date(reservation.date_fin)

          weekDates.forEach((date, dayIndex) => {
            if (date >= resStart && date <= resEnd) {
              reservation.reservation_slots?.forEach(slot => {
                if (slot.jour === dayIndex) {
                  pendingForWeek.push({
                    date: format(date, 'yyyy-MM-dd'),
                    heure_debut: slot.heure_debut,
                    heure_fin: slot.heure_fin,
                    reservation_id: reservation.id
                  })
                }
              })
            }
          })
        })
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

  // Get working hours for a specific day (0-6)
  const getWorkingHoursForDay = (dayIndex) => {
    const daySchedule = schedule.find(s => s.jour === dayIndex)
    if (!daySchedule) return null
    return {
      start: daySchedule.heure_debut,
      end: daySchedule.heure_fin
    }
  }

  // Check if a slot is booked
  const getBookedSlot = (date, timeStart, timeEnd) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return bookedSlots.find(slot =>
      slot.date === dateStr &&
      timeToMinutes(slot.heure_debut) <= timeToMinutes(timeStart) &&
      timeToMinutes(slot.heure_fin) >= timeToMinutes(timeEnd)
    )
  }

  // Check if a slot is pending
  const isPending = (date, timeStart, timeEnd) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return pendingSlots.some(slot =>
      slot.date === dateStr &&
      timeToMinutes(slot.heure_debut) <= timeToMinutes(timeStart) &&
      timeToMinutes(slot.heure_fin) >= timeToMinutes(timeEnd)
    )
  }

  // Check if a slot is selected (for select mode)
  const isSelected = (dayIndex, timeStart, timeEnd) => {
    return selectedSlots.some(slot =>
      slot.jour === dayIndex &&
      slot.heure_debut === timeStart &&
      slot.heure_fin === timeEnd
    )
  }

  // Handle slot click (for select mode)
  const handleSlotClick = (dayIndex, timeStart, timeEnd, date) => {
    if (mode !== 'select' || !onSlotSelect) return

    // Don't allow selecting booked or pending slots
    if (getBookedSlot(date, timeStart, timeEnd) || isPending(date, timeStart, timeEnd)) {
      return
    }

    onSlotSelect({
      jour: dayIndex,
      heure_debut: timeStart,
      heure_fin: timeEnd
    })
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
        <div className="text-gray-500">Chargement du calendrier...</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header with navigation */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <button
          onClick={goToPreviousWeek}
          className="p-2 hover:bg-gray-200 rounded-lg transition"
          title="Semaine précédente"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-4">
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition"
          >
            Aujourd'hui
          </button>
          <h3 className="text-lg font-semibold text-gray-800">
            {format(weekStart, 'd MMM', { locale: fr })} - {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: fr })}
          </h3>
        </div>

        <button
          onClick={goToNextWeek}
          className="p-2 hover:bg-gray-200 rounded-lg transition"
          title="Semaine suivante"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 p-3 border-b border-gray-200 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span>Réservé</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-gray-300 rounded" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)' }}></div>
          <span>En attente</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded"></div>
          <span>Non travaillé</span>
        </div>
        {mode === 'select' && (
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-purple-500 rounded"></div>
            <span>Sélectionné</span>
          </div>
        )}
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[700px]">
          <thead>
            <tr>
              <th className="w-16 p-2 text-xs text-gray-500 border-r border-gray-200 bg-gray-50">
                Heure
              </th>
              {weekDates.map((date, index) => {
                const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                const workingHours = getWorkingHoursForDay(index)
                return (
                  <th
                    key={index}
                    className={`p-2 text-center border-r border-gray-200 ${
                      isToday ? 'bg-purple-50' : 'bg-gray-50'
                    } ${!workingHours ? 'opacity-50' : ''}`}
                  >
                    <div className={`text-sm font-medium capitalize ${isToday ? 'text-purple-700' : 'text-gray-700'}`}>
                      {JOURS_COURTS[index]}
                    </div>
                    <div className={`text-xs ${isToday ? 'text-purple-600' : 'text-gray-500'}`}>
                      {format(date, 'd MMM', { locale: fr })}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {displaySlots.map((timeSlot, slotIndex) => (
              <tr key={slotIndex} className="border-t border-gray-100">
                <td className="p-1 text-xs text-gray-500 text-center border-r border-gray-200 bg-gray-50">
                  {formatTime(timeSlot.start)}
                </td>
                {weekDates.map((date, dayIndex) => {
                  const workingHours = getWorkingHoursForDay(dayIndex)
                  const isWorking = workingHours &&
                    timeToMinutes(timeSlot.start) >= timeToMinutes(workingHours.start) &&
                    timeToMinutes(timeSlot.end) <= timeToMinutes(workingHours.end)

                  const bookedSlot = getBookedSlot(date, timeSlot.start, timeSlot.end)
                  const pending = isPending(date, timeSlot.start, timeSlot.end)
                  const selected = mode === 'select' && isSelected(dayIndex, timeSlot.start, timeSlot.end)
                  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                  const isPast = date < new Date() && !isToday

                  let cellClass = 'h-8 border-r border-gray-100 transition-colors '
                  let content = null

                  if (!isWorking) {
                    // Non-working hours
                    cellClass += 'bg-gray-100'
                  } else if (bookedSlot) {
                    // Booked
                    cellClass += 'bg-blue-500'
                    if (showChildNames && bookedSlot.children?.rgpd_consent_display_name) {
                      content = (
                        <span className="text-xs text-white truncate px-1">
                          {bookedSlot.children.prenom}
                        </span>
                      )
                    }
                  } else if (pending) {
                    // Pending reservation
                    cellClass += 'bg-gray-300'
                    content = (
                      <div
                        className="w-full h-full"
                        style={{
                          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)'
                        }}
                      />
                    )
                  } else if (selected) {
                    // Selected (in select mode)
                    cellClass += 'bg-purple-500 cursor-pointer'
                  } else if (isPast) {
                    // Past slots
                    cellClass += 'bg-gray-200'
                  } else {
                    // Available
                    cellClass += 'bg-green-100 hover:bg-green-200'
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
                        bookedSlot ? 'Réservé' :
                        pending ? 'En attente de confirmation' :
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
        <div className="p-4 border-t border-gray-200 bg-purple-50">
          <p className="text-sm text-purple-700">
            <strong>{selectedSlots.length}</strong> créneau{selectedSlots.length > 1 ? 'x' : ''} sélectionné{selectedSlots.length > 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )
}
