import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { addMonths, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { logger } from '../../utils/logger'
import {
  JOURS,
  generateTimeOptions,
  calculateHours,
  calculateAvgHoursPerMonth,
  formatHours,
  formatTime,
  formatDateForDB,
  parseLocalDate,
  getToday,
  formatDuration
} from '../../utils/scheduling'

export default function ReservationModal({ assistante, onClose, onSuccess }) {
  const { user } = useAuth()

  // Form state
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [selectedChild, setSelectedChild] = useState('')
  const [selectedSlots, setSelectedSlots] = useState([]) // Array of {jour, heure_debut, heure_fin}
  const [isRemplacement, setIsRemplacement] = useState(false) // CDD vs CDI
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Data state
  const [children, setChildren] = useState([])
  const [schedule, setSchedule] = useState([]) // horaires_travail
  const [loadingData, setLoadingData] = useState(true)
  const [showAddChild, setShowAddChild] = useState(false)
  const [newChildName, setNewChildName] = useState('')

  const timeOptions = generateTimeOptions('06:00', '22:00')

  // Load children and assistante schedule
  useEffect(() => {
    loadData()
  }, [])

  // Auto-populate start date with earliest availability
  useEffect(() => {
    if (assistante.availability?.earliestDate && !dateDebut) {
      // Format the Date object for the input
      const formattedDate = formatDateForDB(assistante.availability.earliestDate)
      setDateDebut(formattedDate)
    }
  }, [assistante.availability])

  // Clear selected slots that are no longer valid when start date changes
  useEffect(() => {
    if (!dateDebut || selectedSlots.length === 0) return

    const dayAvailability = assistante.availability?.dayAvailability || {}
    const selectedStartDate = parseLocalDate(dateDebut)

    const validSlots = selectedSlots.filter(slot => {
      const dayInfo = dayAvailability[slot.jour]
      if (!dayInfo) return true // No info means available
      if (dayInfo.isCDIFull) return false
      if (!dayInfo.availableFrom) return false
      return selectedStartDate >= dayInfo.availableFrom
    })

    if (validSlots.length !== selectedSlots.length) {
      setSelectedSlots(validSlots)
    }
  }, [dateDebut])

  const loadData = async () => {
    setLoadingData(true)
    try {
      // Load parent's children
      const { data: childrenData } = await supabase
        .from('children')
        .select('id, prenom')
        .eq('parent_id', user.id)
        .order('prenom')

      setChildren(childrenData || [])

      // Auto-select first child if only one
      if (childrenData?.length === 1) {
        setSelectedChild(childrenData[0].id)
      }

      // Load assistante's schedule
      const { data: horaires } = await supabase
        .from('horaires_travail')
        .select('jour, heure_debut, heure_fin')
        .eq('assistante_id', assistante.id)

      setSchedule(horaires || [])
    } catch (err) {
      logger.error('Error loading data:', err)
    } finally {
      setLoadingData(false)
    }
  }

  // Add child inline
  const handleAddChild = async () => {
    if (!newChildName.trim()) return

    try {
      const { data, error } = await supabase
        .from('children')
        .insert([{
          parent_id: user.id,
          prenom: newChildName.trim(),
          rgpd_consent_display_name: false
        }])
        .select()
        .single()

      if (error) throw error

      setChildren([...children, data])
      setSelectedChild(data.id)
      setNewChildName('')
      setShowAddChild(false)
    } catch (err) {
      logger.error('Error adding child:', err)
      setError('Erreur lors de l\'ajout de l\'enfant')
    }
  }

  // Normalize time to HH:MM format (remove seconds if present)
  const normalizeTime = (time) => {
    if (!time) return time
    // Handle "HH:MM:SS" format from database
    return time.substring(0, 5)
  }

  // Get schedule for a day (with normalized times)
  const getScheduleForDay = (jour) => {
    const found = schedule.find(s => s.jour === jour)
    if (!found) return null
    return {
      ...found,
      heure_debut: normalizeTime(found.heure_debut),
      heure_fin: normalizeTime(found.heure_fin)
    }
  }

  // Toggle slot selection for a day
  const toggleSlot = (jour, heure_debut, heure_fin) => {
    const existingIndex = selectedSlots.findIndex(
      s => s.jour === jour && s.heure_debut === heure_debut && s.heure_fin === heure_fin
    )

    if (existingIndex >= 0) {
      setSelectedSlots(selectedSlots.filter((_, i) => i !== existingIndex))
    } else {
      setSelectedSlots([...selectedSlots, { jour, heure_debut, heure_fin }])
    }
  }

  // Check if a slot is selected
  const isSlotSelected = (jour, heure_debut, heure_fin) => {
    return selectedSlots.some(
      s => s.jour === jour && s.heure_debut === heure_debut && s.heure_fin === heure_fin
    )
  }

  // Update time for a day
  const updateDayTime = (jour, field, value) => {
    const daySlots = selectedSlots.filter(s => s.jour === jour)
    const otherSlots = selectedSlots.filter(s => s.jour !== jour)

    if (daySlots.length > 0) {
      // Update existing slot for this day
      const updated = {
        jour,
        heure_debut: field === 'heure_debut' ? value : daySlots[0].heure_debut,
        heure_fin: field === 'heure_fin' ? value : daySlots[0].heure_fin
      }
      setSelectedSlots([...otherSlots, updated])
    }
  }

  // Calculate hours per week from selected slots
  const calculateWeeklyHours = () => {
    return selectedSlots.reduce((total, slot) => {
      return total + calculateHours(slot.heure_debut, slot.heure_fin)
    }, 0)
  }

  // Validation
  const validateForm = () => {
    if (!selectedChild) {
      return "Veuillez sélectionner un enfant"
    }
    if (!dateDebut) {
      return "Veuillez sélectionner la date de début"
    }
    if (isRemplacement) {
      if (!dateFin) {
        return "Veuillez sélectionner la date de fin pour un remplacement"
      }
      if (parseLocalDate(dateFin) < parseLocalDate(dateDebut)) {
        return "La date de fin doit être après la date de début"
      }
    }
    if (selectedSlots.length === 0) {
      return "Veuillez sélectionner au moins un créneau"
    }
    return null
  }

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault()

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create reservation
      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .insert([{
          parent_id: user.id,
          assistante_id: assistante.id,
          child_id: selectedChild,
          date_debut: dateDebut,
          date_fin: isRemplacement && dateFin ? dateFin : null,
          statut: 'en_attente',
          notes: notes.trim() || null
        }])
        .select()
        .single()

      if (reservationError) throw reservationError

      // Create reservation slots
      const slotsData = selectedSlots.map(slot => ({
        reservation_id: reservation.id,
        jour: slot.jour,
        heure_debut: slot.heure_debut,
        heure_fin: slot.heure_fin
      }))

      const { error: slotsError } = await supabase
        .from('reservation_slots')
        .insert(slotsData)

      if (slotsError) throw slotsError

      onSuccess(reservation)
    } catch (err) {
      logger.error('Reservation error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Date constraints
  const today = formatDateForDB(getToday())

  // Calculate summary
  const weeklyHours = calculateWeeklyHours()
  const avgMonthlyHours = calculateAvgHoursPerMonth(weeklyHours, assistante.vacation_weeks || 5)

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
        <div className="bg-white rounded-lg p-8">
          <div className="text-center text-gray-500">Chargement...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                Réserver chez {assistante.prenom} {assistante.nom}
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                {assistante.adresse}, {assistante.ville}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Info bar */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-gray-600">Capacité :</span>
                <span className="ml-1 font-semibold text-blue-700">
                  {assistante.max_kids || 4} enfant{(assistante.max_kids || 4) > 1 ? 's' : ''}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Vacances :</span>
                <span className="ml-1 font-semibold text-blue-700">
                  {assistante.vacation_weeks || 5} sem/an
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Child selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enfant concerné *
              </label>
              {children.length === 0 && !showAddChild ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 mb-3">
                    Vous devez d'abord ajouter un enfant pour pouvoir réserver.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddChild(true)}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm font-medium"
                  >
                    + Ajouter un enfant
                  </button>
                </div>
              ) : showAddChild ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newChildName}
                    onChange={(e) => setNewChildName(e.target.value)}
                    placeholder="Prénom de l'enfant"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddChild}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Ajouter
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddChild(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={selectedChild}
                    onChange={(e) => setSelectedChild(e.target.value)}
                    required
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner un enfant</option>
                    {children.map(child => (
                      <option key={child.id} value={child.id}>{child.prenom}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddChild(true)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    + Nouveau
                  </button>
                </div>
              )}
            </div>

            {/* Remplacement checkbox */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRemplacement}
                  onChange={(e) => {
                    setIsRemplacement(e.target.checked)
                    if (!e.target.checked) {
                      setDateFin('') // Clear date_fin when unchecking
                    }
                  }}
                  className="h-5 w-5 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
                <div>
                  <span className="font-medium text-gray-900">Remplacement (CDD)</span>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Cochez si vous cherchez un accueil temporaire avec une date de fin définie
                  </p>
                </div>
              </label>
            </div>

            {/* Dates */}
            <div className={`grid gap-4 ${isRemplacement ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de début *
                </label>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  min={today}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {isRemplacement && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de fin *
                  </label>
                  <input
                    type="date"
                    value={dateFin}
                    onChange={(e) => setDateFin(e.target.value)}
                    min={dateDebut || today}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {isRemplacement && dateDebut && dateFin && (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                Durée du remplacement : {formatDuration(parseLocalDate(dateDebut), parseLocalDate(dateFin))}
              </div>
            )}

            {!isRemplacement && (
              <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                Contrat à durée indéterminée (CDI) - sans date de fin
              </div>
            )}

            {/* Time slots selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Créneaux souhaités *
              </label>
              <p className="text-xs text-gray-500 mb-4">
                Sélectionnez les jours et horaires souhaités pour votre enfant
              </p>

              <div className="space-y-3">
                {JOURS.map((jourNom, index) => {
                  const daySchedule = getScheduleForDay(index)
                  const isWorking = !!daySchedule

                  // Get day availability info from dayAvailability structure
                  const dayAvailability = assistante.availability?.dayAvailability || {}
                  const dayInfo = dayAvailability[index]

                  // Determine availability based on selected start date
                  const selectedStartDate = parseLocalDate(dateDebut)
                  let availableFromDate = null
                  let canSelectDay = false
                  let isCDIFull = false

                  if (isWorking && dayInfo) {
                    isCDIFull = dayInfo.isCDIFull
                    availableFromDate = dayInfo.availableFrom

                    if (!isCDIFull && dayInfo.availableFrom) {
                      // Day is available if start date is on or after availableFrom
                      canSelectDay = selectedStartDate && selectedStartDate >= dayInfo.availableFrom
                    }
                  } else if (isWorking && !dayInfo) {
                    // No availability info means day is available (no reservations)
                    canSelectDay = true
                  }

                  const selectedSlot = selectedSlots.find(s => s.jour === index)
                  const isSelected = !!selectedSlot

                  // Format the availableFrom date for display
                  const formatAvailableDate = (date) => {
                    if (!date) return ''
                    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                  }

                  return (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border-2 transition ${
                        !canSelectDay
                          ? 'bg-gray-50 border-gray-200 opacity-60'
                          : isSelected
                          ? 'bg-blue-50 border-blue-300'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Day toggle */}
                        <button
                          type="button"
                          disabled={!canSelectDay}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedSlots(selectedSlots.filter(s => s.jour !== index))
                            } else if (daySchedule) {
                              setSelectedSlots([...selectedSlots, {
                                jour: index,
                                heure_debut: daySchedule.heure_debut,
                                heure_fin: daySchedule.heure_fin
                              }])
                            }
                          }}
                          className={`w-24 py-2 px-3 rounded-lg font-medium text-sm capitalize transition ${
                            !canSelectDay
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {jourNom.substring(0, 3)}
                        </button>

                        {/* Time selectors or status message */}
                        {canSelectDay ? (
                          isSelected ? (
                            <div className="flex items-center gap-2 flex-1">
                              <select
                                value={selectedSlot.heure_debut}
                                onChange={(e) => updateDayTime(index, 'heure_debut', e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                {timeOptions
                                  .filter(t => t >= daySchedule.heure_debut && t < daySchedule.heure_fin)
                                  .map(t => (
                                    <option key={t} value={t}>{formatTime(t)}</option>
                                  ))}
                              </select>
                              <span className="text-gray-500">à</span>
                              <select
                                value={selectedSlot.heure_fin}
                                onChange={(e) => updateDayTime(index, 'heure_fin', e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                {timeOptions
                                  .filter(t => t > selectedSlot.heure_debut && t <= daySchedule.heure_fin)
                                  .map(t => (
                                    <option key={t} value={t}>{formatTime(t)}</option>
                                  ))}
                              </select>
                              <span className="text-xs text-gray-500 ml-2">
                                ({calculateHours(selectedSlot.heure_debut, selectedSlot.heure_fin)}h)
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">
                              Disponible : {formatTime(daySchedule.heure_debut)} - {formatTime(daySchedule.heure_fin)}
                            </span>
                          )
                        ) : !isWorking ? (
                          <span className="text-sm text-gray-400 italic">
                            Non travaillé
                          </span>
                        ) : isCDIFull ? (
                          <span className="text-sm text-red-500 italic">
                            Complet
                          </span>
                        ) : availableFromDate && selectedStartDate && selectedStartDate < availableFromDate ? (
                          <span className="text-sm text-orange-500 italic">
                            Complet jusqu'au {formatAvailableDate(availableFromDate)}
                          </span>
                        ) : (
                          <span className="text-sm text-orange-500 italic">
                            Sélectionnez une date de début
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Notes/Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message pour l'assistante (optionnel)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Besoin de places pour jumeaux, horaires flexibles, allergies particulières..."
                rows={4}
                maxLength={500}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                {notes.length}/500 caractères
              </p>
            </div>

            {/* Summary */}
            {selectedSlots.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-3">Récapitulatif</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Heures par semaine</p>
                    <p className="text-xl font-bold text-green-700">
                      {formatHours(weeklyHours)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">
                      Moyenne mensuelle
                      <span className="text-xs text-gray-500 block">
                        (avec {assistante.vacation_weeks || 5} sem. de vacances)
                      </span>
                    </p>
                    <p className="text-xl font-bold text-green-700">
                      {formatHours(avgMonthlyHours)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-xs text-gray-600">
                    Jours sélectionnés : {selectedSlots.map(s => JOURS[s.jour].substring(0, 3)).join(', ')}
                  </p>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading || children.length === 0}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Envoi...' : 'Envoyer la demande'}
              </button>
            </div>
          </form>

          <p className="text-xs text-gray-500 mt-4 text-center">
            Votre demande sera envoyée à l'assistante maternelle qui pourra l'accepter ou la refuser.
          </p>
        </div>
      </div>
    </div>
  )
}
