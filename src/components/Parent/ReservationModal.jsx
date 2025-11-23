import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { addMonths, format, differenceInMonths } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function ReservationModal({ assistante, onClose, onSuccess }) {
  const { user } = useAuth()
  
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [joursSelectionnes, setJoursSelectionnes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const joursDisponibles = assistante.jours_ouvrables || []

  const toggleJour = (jour) => {
    if (joursSelectionnes.includes(jour)) {
      setJoursSelectionnes(joursSelectionnes.filter(j => j !== jour))
    } else {
      setJoursSelectionnes([...joursSelectionnes, jour])
    }
  }

  const validateDates = () => {
    if (!dateDebut || !dateFin) {
      return "Veuillez sélectionner les dates"
    }

    const debut = new Date(dateDebut)
    const fin = new Date(dateFin)
    const months = differenceInMonths(fin, debut)

    if (months < 3) {
      return "La réservation doit être d'au moins 3 mois"
    }

    if (joursSelectionnes.length === 0) {
      return "Veuillez sélectionner au moins un jour"
    }

    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const validationError = validateDates()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: reservationError } = await supabase
        .from('reservations')
        .insert([
          {
            parent_id: user.id,
            assistante_id: assistante.id,
            date_debut: dateDebut,
            date_fin: dateFin,
            jours_semaine: joursSelectionnes,
            statut: 'en_attente'
          }
        ])
        .select()
        .single()

      if (reservationError) throw reservationError

      onSuccess(data)
    } catch (err) {
      console.error('Reservation error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Date minimum : aujourd'hui
  const today = format(new Date(), 'yyyy-MM-dd')
  
  // Date minimum pour la fin : 3 mois après le début
  const minDateFin = dateDebut 
    ? format(addMonths(new Date(dateDebut), 3), 'yyyy-MM-dd')
    : today

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informations */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Tarif journalier</p>
                  <p className="text-xl font-bold text-blue-600">
                    {assistante.tarif_journalier}€
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Places disponibles</p>
                  <p className="text-xl font-bold text-blue-600">
                    {assistante.places_disponibles}
                  </p>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de fin * (minimum 3 mois)
                </label>
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  min={minDateFin}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {dateDebut && dateFin && (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                Durée : {differenceInMonths(new Date(dateFin), new Date(dateDebut))} mois
              </div>
            )}

            {/* Jours de la semaine */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Jours souhaités *
              </label>
              <div className="grid grid-cols-5 gap-2">
                {['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'].map(jour => {
                  const isDisponible = joursDisponibles.includes(jour)
                  const isSelected = joursSelectionnes.includes(jour)
                  
                  return (
                    <button
                      key={jour}
                      type="button"
                      onClick={() => isDisponible && toggleJour(jour)}
                      disabled={!isDisponible}
                      className={`p-3 rounded-lg border-2 transition capitalize text-sm font-medium ${
                        !isDisponible
                          ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                          : isSelected
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      {jour}
                      {!isDisponible && <div className="text-xs mt-1">Non dispo</div>}
                    </button>
                  )
                })}
              </div>
              {joursSelectionnes.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {joursSelectionnes.length} jour{joursSelectionnes.length > 1 ? 's' : ''} sélectionné{joursSelectionnes.length > 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Estimation */}
            {dateDebut && dateFin && joursSelectionnes.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 mb-2">Estimation mensuelle :</p>
                <p className="text-2xl font-bold text-green-600">
                  ~{(assistante.tarif_journalier * joursSelectionnes.length * 4).toFixed(2)}€/mois
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ({joursSelectionnes.length} jours × 4 semaines × {assistante.tarif_journalier}€)
                </p>
              </div>
            )}

            {/* Boutons */}
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
                disabled={loading}
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