import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useGeocoding } from '../../hooks/useGeocoding'
import JoursSemaine from './JoursSemaine'

export default function AssistanteProfile() {
  const { user, profile } = useAuth()
  const { geocodeAddress } = useGeocoding()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

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
    setSaving(true)

    try {
      console.log('Submitting profile...')
      
      // 1. Géocoder l'adresse
      console.log('Geocoding address...')
      const coords = await geocodeAddress(
        formData.adresse,
        formData.code_postal,
        formData.ville
      )
      console.log('Coordinates:', coords)

      // 2. Créer ou mettre à jour le profil assistante
      const assistantePayload = {
        user_id: user.id,
        adresse: formData.adresse,
        ville: formData.ville,
        code_postal: formData.code_postal,
        places_totales: parseInt(formData.places_totales),
        places_disponibles: parseInt(formData.places_disponibles),
        tarif_journalier: parseFloat(formData.tarif_journalier),
        description: formData.description,
        agrement: formData.agrement,
        location: `POINT(${coords.longitude} ${coords.latitude})`
      }

      let assistanteId = assistanteData?.id

      if (assistanteData) {
        // Mise à jour
        console.log('Updating existing profile...')
        const { error: updateError } = await supabase
          .from('assistantes_maternelles')
          .update(assistantePayload)
          .eq('id', assistanteData.id)

        if (updateError) throw updateError
        console.log('Profile updated')
      } else {
        // Création
        console.log('Creating new profile...')
        const { data: newAssistante, error: insertError } = await supabase
          .from('assistantes_maternelles')
          .insert([assistantePayload])
          .select()
          .single()

        if (insertError) throw insertError
        assistanteId = newAssistante.id
        setAssistanteData(newAssistante)
        console.log('Profile created:', newAssistante)
      }

      // 3. Gérer les jours ouvrables
      console.log('Updating jours ouvrables...')
      
      // Supprimer les anciens
      await supabase
        .from('jours_ouvrables')
        .delete()
        .eq('assistante_id', assistanteId)

      // Insérer les nouveaux
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

      console.log('Jours ouvrables updated')
      setMessage('✅ Profil sauvegardé avec succès !')
      
      // Scroll to top to see message
      window.scrollTo({ top: 0, behavior: 'smooth' })
      
    } catch (err) {
      console.error('Error saving profile:', err)
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
          {/* Adresse */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adresse *
            </label>
            <input
              type="text"
              name="adresse"
              value={formData.adresse}
              onChange={handleChange}
              required
              placeholder="12 rue de la République"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Code postal *
              </label>
              <input
                type="text"
                name="code_postal"
                value={formData.code_postal}
                onChange={handleChange}
                required
                placeholder="75001"
                pattern="[0-9]{5}"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ville *
              </label>
              <input
                type="text"
                name="ville"
                value={formData.ville}
                onChange={handleChange}
                required
                placeholder="Paris"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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