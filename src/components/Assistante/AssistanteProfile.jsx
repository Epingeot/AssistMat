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
    tarif_horaire: '',
    description: '',
    agrement: '',
    agrement_date: '',
    has_garden: false,
    has_pets: false,
    pets_description: '',
  })
  const [joursOuvrables, setJoursOuvrables] = useState([])
  const [typesAccueil, setTypesAccueil] = useState([])
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [uploading, setUploading] = useState(false)

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
          tarif_horaire: assistante.tarif_horaire || '',
          description: assistante.description || '',
          agrement: assistante.agrement || '',
          agrement_date: assistante.agrement_date || '',
          has_garden: assistante.has_garden || false,
          has_pets: assistante.has_pets || false,
          pets_description: assistante.pets_description || '',
        })

        // Set photo preview if exists
        if (assistante.photo_url) {
          setPhotoPreview(assistante.photo_url)
        }

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

        // Load types d'accueil
        const { data: types } = await supabase
          .from('types_accueil')
          .select('type')
          .eq('assistante_id', assistante.id)

        if (types) {
          setTypesAccueil(types.map(t => t.type))
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image')
      return
    }
    if (file.size > 2 * 1024 * 1024) { // 2MB
      setError('L\'image doit faire moins de 2 MB')
      return
    }

    setPhotoFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPhotoPreview(reader.result)
    }
    reader.readAsDataURL(file)
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

    if (typesAccueil.length === 0) {
      setError('⚠️ Veuillez sélectionner au moins un type d\'accueil')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setSaving(true)

    try {
      logger.log('📝 Saving profile with validated address:', validatedAddress)

      // Upload photo to Supabase Storage if new photo selected
      let photoUrl = photoPreview // Keep existing URL if no new file
      if (photoFile) {
        setUploading(true)
        logger.log('📸 Uploading photo...')

        const fileExt = photoFile.name.split('.').pop()
        const fileName = `${user.id}/profile.${fileExt}`

        // Delete old photo if exists
        if (assistanteData?.photo_url) {
          const oldPath = assistanteData.photo_url.split('/').pop()
          await supabase.storage
            .from('profile-photos')
            .remove([`${user.id}/${oldPath}`])
        }

        // Upload new photo
        const { error: uploadError } = await supabase.storage
          .from('profile-photos')
          .upload(fileName, photoFile, { upsert: true })

        if (uploadError) throw uploadError

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('profile-photos')
          .getPublicUrl(fileName)

        photoUrl = urlData.publicUrl
        logger.log('✅ Photo uploaded:', photoUrl)
        setUploading(false)
      }

      // Payload avec les coordonnées DÉJÀ VALIDÉES
      const assistantePayload = {
        user_id: user.id,
        adresse: validatedAddress.street,
        ville: validatedAddress.city,
        code_postal: validatedAddress.postcode,
        places_totales: parseInt(formData.places_totales),
        places_disponibles: parseInt(formData.places_disponibles),
        tarif_journalier: formData.tarif_journalier ? parseFloat(formData.tarif_journalier) : null,
        tarif_horaire: formData.tarif_horaire ? parseFloat(formData.tarif_horaire) : null,
        description: formData.description,
        agrement: formData.agrement,
        agrement_date: formData.agrement_date || null,
        photo_url: photoUrl,
        has_garden: formData.has_garden,
        has_pets: formData.has_pets,
        pets_description: formData.has_pets ? formData.pets_description : null,
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

      // Gérer les types d'accueil
      logger.log('Updating types accueil...')

      await supabase
        .from('types_accueil')
        .delete()
        .eq('assistante_id', assistanteId)

      if (typesAccueil.length > 0) {
        const typesData = typesAccueil.map(type => ({
          assistante_id: assistanteId,
          type: type
        }))

        const { error: typesError } = await supabase
          .from('types_accueil')
          .insert(typesData)

        if (typesError) throw typesError
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
    <div className="max-w-3xl mx-auto px-4 md:px-0">
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
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
          {/* Photo de profil */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Photo de profil
            </label>
            <div className="flex items-start gap-4">
              {/* Preview */}
              <div className="flex-shrink-0">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Aperçu photo"
                    className="w-24 h-24 rounded-full object-cover border-2 border-purple-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-gray-300 flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Upload button */}
              <div className="flex-1">
                <input
                  type="file"
                  id="photo-upload"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <label
                  htmlFor="photo-upload"
                  className="inline-block px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition"
                >
                  {photoPreview ? 'Changer la photo' : 'Choisir une photo'}
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  JPG, PNG ou WebP • Max 2 MB
                </p>
              </div>
            </div>
          </div>

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

          {/* Tarifs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tarif journalier (€)
              </label>
              <input
                type="number"
                name="tarif_journalier"
                value={formData.tarif_journalier}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="45.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tarif horaire (€)
              </label>
              <input
                type="number"
                name="tarif_horaire"
                value={formData.tarif_horaire}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="6.50"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Jours ouvrables */}
          <JoursSemaine
            selectedJours={joursOuvrables}
            onChange={setJoursOuvrables}
          />

          {/* Types d'accueil */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Type(s) d'accueil proposé(s) *
            </label>
            <div className="space-y-2">
              {[
                { value: 'regulier', label: 'Accueil régulier', desc: 'Journées complètes, 4-5 jours/semaine' },
                { value: 'temps_partiel', label: 'Temps partiel', desc: 'Quelques heures par jour, ou quelques jours par semaine' },
                { value: 'periscolaire', label: 'Garde périscolaire', desc: 'Vacances, mercredis, avant/après école' },
                { value: 'occasionnel', label: 'Garde occasionnelle', desc: 'Babysitting ponctuel' }
              ].map(type => (
                <label key={type.value} className="flex items-start gap-3 p-3 border border-gray-300 rounded-lg hover:bg-purple-50 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={typesAccueil.includes(type.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTypesAccueil([...typesAccueil, type.value])
                      } else {
                        setTypesAccueil(typesAccueil.filter(t => t !== type.value))
                      }
                    }}
                    className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{type.label}</div>
                    <div className="text-xs text-gray-500">{type.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Agrément */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date d'obtention
              </label>
              <input
                type="date"
                name="agrement_date"
                value={formData.agrement_date}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
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

          {/* Informations complémentaires */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Informations complémentaires
            </label>
            <div className="space-y-3">
              {/* Jardin */}
              <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-purple-50 cursor-pointer transition">
                <input
                  type="checkbox"
                  name="has_garden"
                  checked={formData.has_garden}
                  onChange={handleChange}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Jardin disponible</div>
                  <div className="text-xs text-gray-500">Espace extérieur pour les enfants</div>
                </div>
              </label>

              {/* Animaux */}
              <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-purple-50 cursor-pointer transition">
                <input
                  type="checkbox"
                  name="has_pets"
                  checked={formData.has_pets}
                  onChange={handleChange}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Présence d'animaux</div>
                  <div className="text-xs text-gray-500">Des animaux domestiques sont présents au domicile</div>
                </div>
              </label>

              {/* Description des animaux (conditionnelle) */}
              {formData.has_pets && (
                <div className="ml-7">
                  <input
                    type="text"
                    name="pets_description"
                    value={formData.pets_description}
                    onChange={handleChange}
                    placeholder="Ex: 1 chat, 1 petit chien (Yorkshire)..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1 ml-1">
                    Précisez le type et la race des animaux
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bouton */}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 md:py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-base active:scale-98"
          >
            {saving ? 'Sauvegarde en cours...' : 'Enregistrer mon profil'}
          </button>
        </form>
      </div>
    </div>
  )
}