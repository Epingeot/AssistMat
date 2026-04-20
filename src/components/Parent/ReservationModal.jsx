import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { addMonths, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { logger } from '../../utils/logger'
import toast from 'react-hot-toast'
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
  const { user, signIn, signUp } = useAuth()

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

  // Auth form state (for unauthenticated users)
  const [authMode, setAuthMode] = useState('login') // 'login' or 'signup'
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authNom, setAuthNom] = useState('')
  const [authPrenom, setAuthPrenom] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState(null)

  const timeOptions = generateTimeOptions('06:00', '22:00')

  // Load children and assistante schedule (only when authenticated)
  useEffect(() => {
    if (user) {
      loadData()
    } else {
      // Only load schedule for unauthenticated users
      loadScheduleOnly()
    }
  }, [user])

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

  // Load only schedule for unauthenticated users
  const loadScheduleOnly = async () => {
    setLoadingData(true)
    try {
      const { data: horaires } = await supabase
        .from('horaires_travail')
        .select('jour, heure_debut, heure_fin')
        .eq('assistante_id', assistante.id)

      setSchedule(horaires || [])
    } catch (err) {
      logger.error('Error loading schedule:', err)
    } finally {
      setLoadingData(false)
    }
  }

  // Handle auth form submission
  const handleAuthSubmit = async (e) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError(null)

    try {
      if (authMode === 'login') {
        const { error } = await signIn(authEmail, authPassword)
        if (error) throw error
        toast.success('Connexion reussie !')
      } else {
        // Sign up as parent
        const { error } = await signUp(authEmail, authPassword, 'parent', authNom, authPrenom)
        if (error) throw error
        toast.success('Compte cree ! Vous pouvez maintenant entrer en contact avec l\'assistante maternelle.')
      }
      // After successful auth, loadData will be called by the useEffect
    } catch (err) {
      logger.error('Auth error:', err)
      setAuthError(err.message)
    } finally {
      setAuthLoading(false)
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
          is_remplacement: isRemplacement,
          statut: 'demande'
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

      // Post the parent's note (if any) as the first message on the thread
      const initialNote = notes.trim()
      if (initialNote) {
        const { error: messageError } = await supabase
          .from('request_messages')
          .insert({
            reservation_id: reservation.id,
            sender_id: user.id,
            body: initialNote
          })
        if (messageError) logger.error('Error posting initial note:', messageError)
      }

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
          <div className="text-center text-muted">Chargement...</div>
        </div>
      </div>
    )
  }

  // If user is not authenticated, show login/signup form
  if (!user) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
        <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-ink">
                  Envoyer une demande à {assistante.prenom} {assistante.nom}
                </h2>
                <p className="text-muted text-sm mt-1">
                  {assistante.code_postal} {assistante.ville}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-subtle hover:text-muted text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Auth required message */}
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-6">
              <p className="text-ink font-medium">
                Connectez-vous pour envoyer une demande de mise en contact
              </p>
              <p className="text-sm text-primary mt-1">
                Creez un compte gratuit ou connectez-vous pour contacter cette assistante maternelle.
              </p>
            </div>

            {/* Auth error */}
            {authError && (
              <div className="bg-error/10 border border-error/30 text-error px-4 py-3 rounded-lg mb-4">
                {authError}
              </div>
            )}

            {/* Auth form */}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">
                      Prenom
                    </label>
                    <input
                      type="text"
                      value={authPrenom}
                      onChange={(e) => setAuthPrenom(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">
                      Nom
                    </label>
                    <input
                      type="text"
                      value={authNom}
                      onChange={(e) => setAuthNom(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition disabled:opacity-50"
              >
                {authLoading
                  ? 'Chargement...'
                  : authMode === 'login'
                  ? 'Se connecter'
                  : 'Creer mon compte'}
              </button>
            </form>

            {/* Toggle auth mode */}
            <div className="mt-4 text-center text-sm">
              {authMode === 'login' ? (
                <p className="text-muted">
                  Pas encore de compte ?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup')
                      setAuthError(null)
                    }}
                    className="text-primary font-medium hover:underline"
                  >
                    Creer un compte
                  </button>
                </p>
              ) : (
                <p className="text-muted">
                  Deja un compte ?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login')
                      setAuthError(null)
                    }}
                    className="text-primary font-medium hover:underline"
                  >
                    Se connecter
                  </button>
                </p>
              )}
            </div>

            {/* Cancel button */}
            <button
              type="button"
              onClick={onClose}
              className="w-full mt-4 py-2 border border-line text-ink rounded-lg font-medium hover:bg-soft transition"
            >
              Annuler
            </button>
          </div>
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
              <h2 className="text-2xl font-bold text-ink">
                Envoyer une demande à {assistante.prenom} {assistante.nom}
              </h2>
              <p className="text-muted text-sm mt-1">
                {assistante.adresse}, {assistante.ville}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-subtle hover:text-muted text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="bg-error/10 border border-error/30 text-error px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Info bar */}
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-6">
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-muted">Capacité :</span>
                <span className="ml-1 font-semibold text-primary">
                  {assistante.max_kids || 4} enfant{(assistante.max_kids || 4) > 1 ? 's' : ''}
                </span>
              </div>
              <div>
                <span className="text-muted">Absence :</span>
                <span className="ml-1 font-semibold text-primary">
                  {assistante.vacation_weeks || 5} sem/an
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Child selection */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                Enfant concerné *
              </label>
              {children.length === 0 && !showAddChild ? (
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                  <p className="text-sm text-warning mb-3">
                    Vous devez d'abord ajouter un enfant pour pouvoir envoyer une demande.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddChild(true)}
                    className="px-4 py-2 bg-warning text-ink rounded-lg hover:bg-warning/90 transition text-sm font-medium"
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
                    className="flex-1 px-4 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    type="button"
                    onClick={handleAddChild}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                  >
                    Ajouter
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddChild(false)}
                    className="px-4 py-2 border border-line rounded-lg hover:bg-soft"
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
                    className="flex-1 px-4 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">Sélectionner un enfant</option>
                    {children.map(child => (
                      <option key={child.id} value={child.id}>{child.prenom}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddChild(true)}
                    className="px-4 py-2 border border-line text-ink rounded-lg hover:bg-soft"
                  >
                    + Nouveau
                  </button>
                </div>
              )}
            </div>

            {/* Remplacement checkbox */}
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
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
                  className="h-5 w-5 accent-warning focus:ring-warning border-line rounded"
                />
                <div>
                  <span className="font-medium text-ink">Remplacement (CDD)</span>
                  <p className="text-xs text-muted mt-0.5">
                    Cochez si vous cherchez un accueil temporaire avec une date de fin définie
                  </p>
                </div>
              </label>
            </div>

            {/* Dates */}
            <div className={`grid gap-4 ${isRemplacement ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  Date de début *
                </label>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  min={today}
                  required
                  className="w-full px-4 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              {isRemplacement && (
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">
                    Date de fin *
                  </label>
                  <input
                    type="date"
                    value={dateFin}
                    onChange={(e) => setDateFin(e.target.value)}
                    min={dateDebut || today}
                    required
                    className="w-full px-4 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              )}
            </div>

            {isRemplacement && dateDebut && dateFin && (
              <div className="text-sm text-muted bg-soft p-3 rounded-lg">
                Durée du remplacement : {formatDuration(parseLocalDate(dateDebut), parseLocalDate(dateFin))}
              </div>
            )}

            {!isRemplacement && (
              <div className="text-sm text-primary bg-primary/10 p-3 rounded-lg">
                Contrat à durée indéterminée (CDI) - sans date de fin
              </div>
            )}

            {/* Time slots selection */}
            <div>
              <label className="block text-sm font-medium text-ink mb-3">
                Créneaux souhaités *
              </label>
              <p className="text-xs text-muted mb-4">
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
                          ? 'bg-soft border-hairline opacity-60'
                          : isSelected
                          ? 'bg-primary/10 border-primary/40'
                          : 'bg-white border-hairline hover:border-line'
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
                              ? 'bg-chip text-subtle cursor-not-allowed'
                              : isSelected
                              ? 'bg-primary text-white'
                              : 'bg-chip text-ink hover:bg-line'
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
                                className="px-2 py-1 border border-line rounded text-sm"
                              >
                                {timeOptions
                                  .filter(t => t >= daySchedule.heure_debut && t < daySchedule.heure_fin)
                                  .map(t => (
                                    <option key={t} value={t}>{formatTime(t)}</option>
                                  ))}
                              </select>
                              <span className="text-muted">à</span>
                              <select
                                value={selectedSlot.heure_fin}
                                onChange={(e) => updateDayTime(index, 'heure_fin', e.target.value)}
                                className="px-2 py-1 border border-line rounded text-sm"
                              >
                                {timeOptions
                                  .filter(t => t > selectedSlot.heure_debut && t <= daySchedule.heure_fin)
                                  .map(t => (
                                    <option key={t} value={t}>{formatTime(t)}</option>
                                  ))}
                              </select>
                              <span className="text-xs text-muted ml-2">
                                ({calculateHours(selectedSlot.heure_debut, selectedSlot.heure_fin)}h)
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted">
                              Disponible : {formatTime(daySchedule.heure_debut)} - {formatTime(daySchedule.heure_fin)}
                            </span>
                          )
                        ) : !isWorking ? (
                          <span className="text-sm text-subtle italic">
                            Non travaillé
                          </span>
                        ) : isCDIFull ? (
                          <span className="text-sm text-error italic">
                            Complet
                          </span>
                        ) : availableFromDate && selectedStartDate && selectedStartDate < availableFromDate ? (
                          <span className="text-sm text-warning italic">
                            Complet jusqu'au {formatAvailableDate(availableFromDate)}
                          </span>
                        ) : (
                          <span className="text-sm text-warning italic">
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
              <label className="block text-sm font-medium text-ink mb-2">
                Message pour l'assistante (optionnel)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Besoin de places pour jumeaux, horaires flexibles, allergies particulières..."
                rows={4}
                maxLength={500}
                className="w-full px-4 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent resize-none"
              />
              <p className="text-xs text-muted mt-1">
                {notes.length}/500 caractères
              </p>
            </div>

            {/* Summary */}
            {selectedSlots.length > 0 && (
              <div className="bg-success/10 border border-success/30 rounded-lg p-4">
                <h4 className="font-medium text-ink mb-3">Récapitulatif</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted">Heures par semaine</p>
                    <p className="text-xl font-bold text-ink">
                      {formatHours(weeklyHours)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted">
                      Moyenne mensuelle
                      <span className="text-xs text-muted block">
                        (avec {assistante.vacation_weeks || 5} sem. d'absence sur l'année)
                      </span>
                    </p>
                    <p className="text-xl font-bold text-ink">
                      {formatHours(avgMonthlyHours)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-success/30">
                  <p className="text-xs text-muted">
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
                className="flex-1 px-4 py-3 border border-line text-ink rounded-lg font-semibold hover:bg-soft transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading || children.length === 0}
                className="flex-1 bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Envoi...' : 'Envoyer la demande'}
              </button>
            </div>
          </form>

          <p className="text-xs text-muted mt-4 text-center">
            Votre demande sera envoyée à l'assistante maternelle qui pourra l'accepter ou la refuser.
          </p>
        </div>
      </div>
    </div>
  )
}
