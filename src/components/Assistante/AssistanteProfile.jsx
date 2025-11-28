import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import JoursSemaine from './JoursSemaine'
import AddressAutocomplete from './AddressAutocomplete'
import { logger } from '../../utils/logger'


export default function AssistanteProfile() {
  const { user, profile } = useAuth()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [validatedAddress, setValidatedAddress] = useState(null)

  // Données du profil
  const [assistanteData, setAssistanteData] = useState(null)
  const [formData, setFormData] = useState({
    adresse: '',
    ville: '',
    code_postal: '',
    places_totales: 4,
    places_disponibles: 4,
    tarif_journalier: '',
    description: '',
    agrement: '',
  })
  const [joursOuvrables, setJoursOuvrables] = useState([])

  // Charger les données existantes
  useEffect(() => {
    if (user) {
      loadAssistanteProfile()
    }
  }, [user])

  const loadAssistanteProfile = async () => {
    setLoading(true)
    
    try {
      const { data: assistante, error } = await supabase
        .from('assistantes_maternelles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error

      if (assistante) {
        setAssistanteData(assistante)
        setFormData({
          adresse: assistante.adresse || '',
          ville: assistante.ville || '',
          code_postal: assistante.code_postal || '',
          places_totales: assistante.places_totales || 4,
          places_disponibles: assistante.places_disponibles || 4,
          tarif_journalier: assistante.tarif_journalier || '',
          description: assistante.description || '',
          agrement: assistante.agrement || '',
        })

        // Set validated address from existing data
        if (assistante.adresse && assistante.ville && assistante.code_postal) {
          setValidatedAddress({
            street: assistante.adresse,
            city: assistante.ville,
            postcode: assistante.code_postal,
            fullAddress: `${assistante.adresse}, ${assistante.code_postal} ${assistante.ville}`,
            latitude: null,  // Will use existing location in database
            longitude: null
          })
        }

        const { data: jours } = await supabase
          .from('jours_ouvrables')
          .select('jour')
          .eq('assistante_id', assistante.id)

        if (jours) {
          setJoursOuvrables(jours.map(j => j.jour))
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    
    // Vérification
    if (!validatedAddress) {
      setError('⚠️ Veuillez sélectionner une adresse dans les suggestions')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setSaving(true)

    try {
      logger.log('📝 Saving profile with validated address:', validatedAddress)

      // Payload avec les coordonnées DÉJÀ VALIDÉES
      const assistantePayload = {
        user_id: user.id,
        adresse: validatedAddress.street,
        ville: validatedAddress.city,
        code_postal: validatedAddress.postcode,
        places_totales: parseInt(formData.places_totales),
        places_disponibles: parseInt(formData.places_disponibles),
        tarif_journalier: parseFloat(formData.tarif_journalier),
        description: formData.description,
        agrement: formData.agrement,
      }

      // Only update location if new coordinates are provided (new address selected)
      if (validatedAddress.latitude && validatedAddress.longitude) {
        assistantePayload.location = `POINT(${validatedAddress.longitude} ${validatedAddress.latitude})`
        logger.log('📍 Using new coordinates:', {
          lat: validatedAddress.latitude,
          lon: validatedAddress.longitude
        })
      } else {
        logger.log('📍 Keeping existing location coordinates')
      }

      let assistanteId = assistanteData?.id

      if (assistanteData) {
        // Mise à jour
        logger.log('Updating existing profile...')
        const { error: updateError } = await supabase
          .from('assistantes_maternelles')
          .update(assistantePayload)
          .eq('id', assistanteData.id)

        if (updateError) throw updateError
        logger.log('Profile updated')
      } else {
        // Création
        logger.log('Creating new profile...')
        const { data: newAssistante, error: insertError } = await supabase
          .from('assistantes_maternelles')
          .insert([assistantePayload])
          .select()
          .single()

        if (insertError) throw insertError
        assistanteId = newAssistante.id
        setAssistanteData(newAssistante)
        logger.log('Profile created:', newAssistante)
      }

      // Gérer les jours ouvrables
      logger.log('Updating jours ouvrables...')
      
      await supabase
        .from('jours_ouvrables')
        .delete()
        .eq('assistante_id', assistanteId)

      if (joursOuvrables.length > 0) {
        const joursData = joursOuvrables.map(jour => ({
          assistante_id: assistanteId,
          jour: jour
        }))

        const { error: joursError } = await supabase
          .from('jours_ouvrables')
          .insert(joursData)

        if (joursError) throw joursError
      }

      logger.log('✅ Everything saved successfully')
      setMessage('✅ Profil sauvegardé avec succès !')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      
    } catch (err) {
      logger.error('❌ Error saving profile:', err)
      setError(`Erreur : ${err.message}`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg text-gray-600">Chargement de votre profil...</div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Mon profil professionnel
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
            {message}
          </div>
        )}

        {!assistanteData && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-6">
            <p className="font-semibold">👋 Bienvenue !</p>
            <p className="text-sm mt-1">
              Complétez votre profil professionnel pour que les parents puissent vous trouver.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Autocomplétion d'adresse */}
          <AddressAutocomplete
            initialValue={formData.adresse}
            onSelectAddress={(address) => {
              logger.log('✅ Address selected:', address)

              setValidatedAddress(address)
              setFormData(prev => ({
                ...prev,
                adresse: address.street,
                ville: address.city,
                code_postal: address.postcode
              }))
            }}
          />
          {/* Afficher l'adresse validée seulement si nouvellement sélectionnée */}
          {validatedAddress && validatedAddress.latitude && validatedAddress.longitude && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-semibold text-green-800 mb-1">
                ✅ Adresse validée
              </p>
              <p className="text-sm text-green-700">
                {validatedAddress.fullAddress}
              </p>
            </div>
          )}

          {/* Ville et Code postal */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ville *
              </label>
              <input
                type="text"
                name="ville"
                value={formData.ville}
                readOnly
                required
                placeholder="Sélectionnez une adresse"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Code postal *
              </label>
              <input
                type="text"
                name="code_postal"
                value={formData.code_postal}
                readOnly
                required
                placeholder="00000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Places */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Places totales *
              </label>
              <input
                type="number"
                name="places_totales"
                value={formData.places_totales}
                onChange={handleChange}
                required
                min="1"
                max="4"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Places disponibles *
              </label>
              <input
                type="number"
                name="places_disponibles"
                value={formData.places_disponibles}
                onChange={handleChange}
                required
                min="0"
                max={formData.places_totales}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Tarif */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tarif journalier (€) *
            </label>
            <input
              type="number"
              name="tarif_journalier"
              value={formData.tarif_journalier}
              onChange={handleChange}
              required
              step="0.01"
              min="0"
              placeholder="45.00"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Jours ouvrables */}
          <JoursSemaine 
            selectedJours={joursOuvrables}
            onChange={setJoursOuvrables}
          />

          {/* Agrément */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Numéro d'agrément
            </label>
            <input
              type="text"
              name="agrement"
              value={formData.agrement}
              onChange={handleChange}
              placeholder="Ex: 075123456"
              autoComplete="off"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              placeholder="Présentez-vous et décrivez votre cadre d'accueil..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Bouton */}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Sauvegarde en cours...' : 'Enregistrer mon profil'}
          </button>
        </form>
      </div>
    </div>
  )
}