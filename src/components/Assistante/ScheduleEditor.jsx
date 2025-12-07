import {
  JOURS,
  generateTimeOptions,
  calculateWeeklyHours,
  calculateAvgHoursPerMonth,
  formatHours,
  formatTimeRange
} from '../../utils/scheduling'

/**
 * ScheduleEditor - 7-day schedule picker with time ranges
 * Replaces the old JoursSemaine component with full time support
 *
 * Props:
 * - schedule: Array of {jour, enabled, heure_debut, heure_fin} for each day (0-6)
 * - vacationWeeks: Number of vacation weeks per year (for avg hours calc)
 * - onChange: Callback when schedule changes
 */
export default function ScheduleEditor({ schedule, vacationWeeks = 5, onChange }) {
  // Generate time options for dropdowns (6:00 to 22:00)
  const timeOptions = generateTimeOptions('06:00', '22:00')

  // Toggle a day on/off
  const toggleDay = (dayIndex) => {
    const newSchedule = [...schedule]
    newSchedule[dayIndex] = {
      ...newSchedule[dayIndex],
      enabled: !newSchedule[dayIndex].enabled
    }
    onChange(newSchedule)
  }

  // Update start time for a day
  const updateStartTime = (dayIndex, time) => {
    const newSchedule = [...schedule]
    newSchedule[dayIndex] = {
      ...newSchedule[dayIndex],
      heure_debut: time
    }
    // Ensure end time is after start time
    if (time >= newSchedule[dayIndex].heure_fin) {
      // Find next time slot after start
      const startIndex = timeOptions.indexOf(time)
      if (startIndex < timeOptions.length - 1) {
        newSchedule[dayIndex].heure_fin = timeOptions[startIndex + 1]
      }
    }
    onChange(newSchedule)
  }

  // Update end time for a day
  const updateEndTime = (dayIndex, time) => {
    const newSchedule = [...schedule]
    newSchedule[dayIndex] = {
      ...newSchedule[dayIndex],
      heure_fin: time
    }
    onChange(newSchedule)
  }

  // Calculate totals
  const enabledDays = schedule.filter(d => d.enabled)
  const weeklyHours = calculateWeeklyHours(
    enabledDays.map(d => ({
      heure_debut: d.heure_debut,
      heure_fin: d.heure_fin
    }))
  )
  const avgMonthlyHours = calculateAvgHoursPerMonth(weeklyHours, vacationWeeks)

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        Horaires de travail
      </label>

      {/* Days grid */}
      <div className="space-y-2">
        {schedule.map((day, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 p-3 rounded-lg border-2 transition ${
              day.enabled
                ? 'border-purple-300 bg-purple-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            {/* Day toggle */}
            <button
              type="button"
              onClick={() => toggleDay(index)}
              className={`w-24 py-2 px-3 rounded-lg font-medium text-sm capitalize transition ${
                day.enabled
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {JOURS[index]}
            </button>

            {/* Time pickers (only shown if day is enabled) */}
            {day.enabled ? (
              <div className="flex items-center gap-2 flex-1">
                <select
                  value={day.heure_debut}
                  onChange={(e) => updateStartTime(index, e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {timeOptions.map(time => (
                    <option key={time} value={time}>
                      {time.replace(':', 'h')}
                    </option>
                  ))}
                </select>

                <span className="text-gray-500">à</span>

                <select
                  value={day.heure_fin}
                  onChange={(e) => updateEndTime(index, e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {timeOptions
                    .filter(time => time > day.heure_debut)
                    .map(time => (
                      <option key={time} value={time}>
                        {time.replace(':', 'h')}
                      </option>
                    ))}
                </select>

                {/* Hours for this day */}
                <span className="text-sm text-gray-500 ml-auto">
                  {formatTimeRange(day.heure_debut, day.heure_fin)}
                </span>
              </div>
            ) : (
              <span className="text-sm text-gray-400 italic">
                Non travaillé
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      {enabledDays.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Heures par semaine</p>
              <p className="text-xl font-bold text-blue-600">
                {formatHours(weeklyHours)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">
                Moyenne mensuelle
                <span className="text-xs text-gray-500 block">
                  (avec {vacationWeeks} sem. de vacances)
                </span>
              </p>
              <p className="text-xl font-bold text-blue-600">
                {formatHours(avgMonthlyHours)}
              </p>
            </div>
          </div>
        </div>
      )}

      {enabledDays.length === 0 && (
        <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
          Veuillez sélectionner au moins un jour de travail
        </p>
      )}
    </div>
  )
}
