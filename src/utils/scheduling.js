/**
 * Scheduling utility functions for AssistMat
 * Handles time slot generation, overlap detection, and hour calculations
 */

// Day mapping: 0=lundi (Monday) through 6=dimanche (Sunday)
// This matches French business convention (week starts Monday)
export const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

// Short day names for compact display
export const JOURS_COURTS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']

/**
 * Get today's date at midnight for consistent date comparisons
 * @returns {Date} Today at 00:00:00.000
 */
export function getToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

/**
 * Parse date string (yyyy-MM-dd) as local date to avoid timezone shift
 * Using new Date("2026-01-15") interprets as UTC midnight, which shifts to
 * the previous day in negative UTC offset timezones. This function parses
 * the date components directly to create a local midnight date.
 * @param {string} dateStr - Date string in yyyy-MM-dd format
 * @returns {Date|null} Date object at local midnight, or null if invalid
 */
export function parseLocalDate(dateStr) {
  if (!dateStr) return null
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Generate time options for dropdowns (30-minute increments)
 * @param {string} startTime - Start time in HH:MM format (default '06:00')
 * @param {string} endTime - End time in HH:MM format (default '22:00')
 * @returns {string[]} Array of time strings like ['06:00', '06:30', '07:00', ...]
 */
export function generateTimeOptions(startTime = '06:00', endTime = '22:00') {
  const options = []
  let [hour, min] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)

  while (hour < endHour || (hour === endHour && min <= endMin)) {
    options.push(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
    min += 30
    if (min >= 60) {
      min = 0
      hour++
    }
  }
  return options
}

/**
 * Generate 30-minute time slots between two times
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @returns {Array<{start: string, end: string}>} Array of slot objects
 */
export function generateTimeSlots(startTime, endTime) {
  const slots = []
  let [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)

  while (startHour < endHour || (startHour === endHour && startMin < endMin)) {
    const slotStart = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`
    startMin += 30
    if (startMin >= 60) {
      startMin = 0
      startHour++
    }
    const slotEnd = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`
    slots.push({ start: slotStart, end: slotEnd })
  }
  return slots
}

/**
 * Check if two time ranges overlap
 * @param {{start: string, end: string}} range1 - First time range
 * @param {{start: string, end: string}} range2 - Second time range
 * @returns {boolean} True if ranges overlap
 */
export function timeRangesOverlap(range1, range2) {
  const start1 = timeToMinutes(range1.start)
  const end1 = timeToMinutes(range1.end)
  const start2 = timeToMinutes(range2.start)
  const end2 = timeToMinutes(range2.end)

  return start1 < end2 && end1 > start2
}

/**
 * Convert time string to minutes since midnight
 * @param {string} timeStr - Time in HH:MM format
 * @returns {number} Minutes since midnight
 */
export function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Convert minutes since midnight to time string
 * @param {number} minutes - Minutes since midnight
 * @returns {string} Time in HH:MM format
 */
export function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

/**
 * Calculate hours between two times
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @returns {number} Hours (can be decimal, e.g., 2.5)
 */
export function calculateHours(startTime, endTime) {
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)
  return (endMinutes - startMinutes) / 60
}

/**
 * Calculate total hours per week from a schedule
 * @param {Array<{jour: number, heure_debut: string, heure_fin: string}>} schedule
 * @returns {number} Total hours per week
 */
export function calculateWeeklyHours(schedule) {
  return schedule.reduce((total, day) => {
    return total + calculateHours(day.heure_debut, day.heure_fin)
  }, 0)
}

/**
 * Calculate average hours per month accounting for vacations
 * Formula: (hours_per_week * (52 - vacation_weeks)) / 12
 * @param {number} hoursPerWeek - Hours worked per week
 * @param {number} vacationWeeks - Weeks of vacation per year (default 5)
 * @returns {number} Average hours per month
 */
export function calculateAvgHoursPerMonth(hoursPerWeek, vacationWeeks = 5) {
  return (hoursPerWeek * (52 - vacationWeeks)) / 12
}

/**
 * Format time for display (e.g., "08:00" -> "8h00")
 * @param {string} timeStr - Time in HH:MM format
 * @returns {string} Formatted time
 */
export function formatTime(timeStr) {
  const [hours, minutes] = timeStr.split(':')
  return `${parseInt(hours)}h${minutes}`
}

/**
 * Format time range for display (e.g., "8h00 - 18h00")
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @returns {string} Formatted time range
 */
export function formatTimeRange(startTime, endTime) {
  return `${formatTime(startTime)} - ${formatTime(endTime)}`
}

/**
 * Format hours with proper French formatting
 * @param {number} hours - Number of hours
 * @returns {string} Formatted hours (e.g., "47,5h")
 */
export function formatHours(hours) {
  // Use French decimal separator (comma)
  return `${hours.toFixed(1).replace('.', ',')}h`
}

/**
 * Get day name from day number
 * @param {number} dayNum - Day number (0-6, where 0=lundi)
 * @returns {string} Day name in French
 */
export function getDayName(dayNum) {
  return JOURS[dayNum] || ''
}

/**
 * Get short day name from day number
 * @param {number} dayNum - Day number (0-6)
 * @returns {string} Short day name (e.g., "lun")
 */
export function getShortDayName(dayNum) {
  return JOURS_COURTS[dayNum] || ''
}

/**
 * Convert French day name to day number
 * @param {string} dayName - French day name (e.g., 'lundi')
 * @returns {number} Day number (0-6) or -1 if not found
 */
export function dayNameToNumber(dayName) {
  return JOURS.indexOf(dayName.toLowerCase())
}

/**
 * Create an empty schedule template (all days disabled)
 * @returns {Array<{jour: number, enabled: boolean, heure_debut: string, heure_fin: string}>}
 */
export function createEmptySchedule() {
  return JOURS.map((_, index) => ({
    jour: index,
    enabled: false,
    heure_debut: '08:00',
    heure_fin: '18:00'
  }))
}

/**
 * Convert database schedule (horaires_travail rows) to UI schedule format
 * @param {Array<{jour: number, heure_debut: string, heure_fin: string}>} dbSchedule
 * @returns {Array<{jour: number, enabled: boolean, heure_debut: string, heure_fin: string}>}
 */
export function dbScheduleToUI(dbSchedule) {
  const uiSchedule = createEmptySchedule()

  dbSchedule.forEach(row => {
    if (row.jour >= 0 && row.jour <= 6) {
      uiSchedule[row.jour] = {
        jour: row.jour,
        enabled: true,
        heure_debut: row.heure_debut,
        heure_fin: row.heure_fin
      }
    }
  })

  return uiSchedule
}

/**
 * Convert UI schedule format to database format (only enabled days)
 * @param {Array<{jour: number, enabled: boolean, heure_debut: string, heure_fin: string}>} uiSchedule
 * @returns {Array<{jour: number, heure_debut: string, heure_fin: string}>}
 */
export function uiScheduleToDb(uiSchedule) {
  return uiSchedule
    .filter(day => day.enabled)
    .map(day => ({
      jour: day.jour,
      heure_debut: day.heure_debut,
      heure_fin: day.heure_fin
    }))
}

/**
 * Summarize a schedule for display (e.g., "Lun-Ven 8h-18h")
 * @param {Array<{jour: number, enabled: boolean, heure_debut: string, heure_fin: string}>} schedule
 * @returns {string} Human-readable schedule summary
 */
export function summarizeSchedule(schedule) {
  const enabledDays = schedule.filter(d => d.enabled)

  if (enabledDays.length === 0) {
    return 'Aucun jour de travail'
  }

  // Check if all days have the same hours
  const firstDay = enabledDays[0]
  const sameHours = enabledDays.every(
    d => d.heure_debut === firstDay.heure_debut && d.heure_fin === firstDay.heure_fin
  )

  // Get day names
  const dayNames = enabledDays.map(d => JOURS_COURTS[d.jour])

  // Check for consecutive days
  const dayNums = enabledDays.map(d => d.jour).sort((a, b) => a - b)
  const isConsecutive = dayNums.every((num, i) => i === 0 || num === dayNums[i - 1] + 1)

  let daysStr
  if (isConsecutive && dayNums.length > 2) {
    // Show as range: "Lun-Ven"
    daysStr = `${JOURS_COURTS[dayNums[0]]}-${JOURS_COURTS[dayNums[dayNums.length - 1]]}`
  } else {
    // Show individual days: "Lun, Mar, Jeu"
    daysStr = dayNames.join(', ')
  }

  if (sameHours) {
    return `${daysStr} ${formatTimeRange(firstDay.heure_debut, firstDay.heure_fin)}`
  } else {
    return `${daysStr} (horaires variables)`
  }
}

/**
 * @typedef {Object} DayAvailabilityInfo
 * @property {Date|null} availableFrom - Date when day becomes available, null if CDI full
 * @property {boolean} isCDIFull - True if day is fully booked with long-term contracts
 */

/**
 * @typedef {Object} AvailabilityResult
 * @property {Date|null} earliestDate - Earliest date when any day becomes available
 * @property {number[]} availableDays - Array of day numbers (0-6) available at earliestDate
 * @property {boolean} isFullyAvailable - True if all working days are available now
 * @property {Object.<number, DayAvailabilityInfo>} dayAvailability - Per-day availability keyed by day number (0=lundi to 6=dimanche)
 */

/**
 * Calculate availability for an assistante by day of week
 * Returns which days are available and when
 * @param {string} assistanteId - The assistante's ID
 * @param {number} maxKids - Maximum number of children
 * @param {Array<{jour: number, heure_debut: string, heure_fin: string}>} horaires - Working schedule
 * @param {object} supabase - Supabase client instance
 * @returns {Promise<AvailabilityResult|null>} Availability info, or null if no working hours or completely full
 */
export async function calculateAvailability(assistanteId, maxKids, horaires, supabase) {
  if (!horaires || horaires.length === 0) {
    return null // No working hours defined
  }

  const workingDays = horaires.map(h => h.jour)
  const today = getToday()

  // Fetch all confirmed reservations
  const { data: reservations, error } = await supabase
    .from('reservations')
    .select(`
      id,
      date_debut,
      date_fin,
      reservation_slots!reservation_slots_reservation_id_fkey(
        jour,
        heure_debut,
        heure_fin
      )
    `)
    .eq('assistante_id', assistanteId)
    .eq('statut', 'confirmee')

  if (error) {
    console.error('Error fetching reservations for availability:', error)
    return null
  }

  // Analyze availability for each working day of the week
  const dayAvailability = {} // { dayNum: { availableFrom: Date, isCDIFull: boolean } }

  for (const dayNum of workingDays) {
    // Separate CDI (long-term) and CDD (replacement) reservations for this day
    const cdiReservations = []
    const cddReservations = []

    for (const res of (reservations || [])) {
      const hasThisDay = res.reservation_slots?.some(slot => slot.jour === dayNum)
      if (!hasThisDay) continue

      if (!res.date_fin) {
        // No end date = CDI (long-term contract)
        cdiReservations.push(res)
      } else {
        // Has end date = CDD (replacement/temporary)
        cddReservations.push(res)
      }
    }

    // Check if this day is fully booked with CDI
    if (cdiReservations.length >= maxKids) {
      dayAvailability[dayNum] = { availableFrom: null, isCDIFull: true }
      continue
    }

    // Day has capacity - check for remplacements
    if (cddReservations.length === 0) {
      // No remplacements - available now!
      dayAvailability[dayNum] = { availableFrom: today, isCDIFull: false }
    } else {
      // Find when the latest remplacement ends
      const latestEndDate = cddReservations.reduce((maxDate, cdd) => {
        const endDate = parseLocalDate(cdd.date_fin)
        return endDate > maxDate ? endDate : maxDate
      }, today)
      // Available the day after the last remplacement ends
      const availableDate = new Date(latestEndDate)
      availableDate.setDate(availableDate.getDate() + 1)
      dayAvailability[dayNum] = { availableFrom: availableDate, isCDIFull: false }
    }
  }

  // Check if all days are fully booked (CDI)
  const availableDayNums = workingDays.filter(day => !dayAvailability[day]?.isCDIFull)
  if (availableDayNums.length === 0) {
    return null // Completely full
  }

  // Find the earliest date when any day becomes available
  let earliestDate = null
  for (const availableDayNum of availableDayNums) {
    const availableFrom = dayAvailability[availableDayNum].availableFrom
    if (availableFrom && (!earliestDate || availableFrom < earliestDate)) {
      earliestDate = availableFrom
    }
  }

  // Find all days that are available at the earliest date
  const availableDays = availableDayNums.filter(availableDayNum => {
    const availableFrom = dayAvailability[availableDayNum].availableFrom
    return availableFrom && availableFrom <= earliestDate
  })

  // Check if fully available (all working days available now)
  const isFullyAvailable =
    availableDays.length === workingDays.length &&
    earliestDate <= today

  return {
    earliestDate,
    availableDays,
    isFullyAvailable,
    dayAvailability
  }
}
