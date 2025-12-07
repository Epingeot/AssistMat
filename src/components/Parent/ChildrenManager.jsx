import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

/**
 * ChildrenManager - Component for parents to manage their children
 * Handles CRUD operations and RGPD consent for name display
 */
export default function ChildrenManager() {
  const { user } = useAuth()
  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingChild, setEditingChild] = useState(null)
  const [formData, setFormData] = useState({
    prenom: '',
    date_naissance: '',
    rgpd_consent_display_name: false
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      loadChildren()
    }
  }, [user])

  const loadChildren = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setChildren(data || [])
    } catch (err) {
      console.error('Error loading children:', err)
      toast.error('Erreur lors du chargement des enfants')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      prenom: '',
      date_naissance: '',
      rgpd_consent_display_name: false
    })
    setEditingChild(null)
    setShowAddForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.prenom.trim()) {
      toast.error('Le prénom est obligatoire')
      return
    }

    setSaving(true)
    try {
      if (editingChild) {
        // Update existing child
        const { error } = await supabase
          .from('children')
          .update({
            prenom: formData.prenom.trim(),
            date_naissance: formData.date_naissance || null,
            rgpd_consent_display_name: formData.rgpd_consent_display_name,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingChild.id)

        if (error) throw error
        toast.success('Enfant modifié')
      } else {
        // Add new child
        const { error } = await supabase
          .from('children')
          .insert([{
            parent_id: user.id,
            prenom: formData.prenom.trim(),
            date_naissance: formData.date_naissance || null,
            rgpd_consent_display_name: formData.rgpd_consent_display_name
          }])

        if (error) throw error
        toast.success('Enfant ajouté')
      }

      resetForm()
      loadChildren()
    } catch (err) {
      console.error('Error saving child:', err)
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (child) => {
    setEditingChild(child)
    setFormData({
      prenom: child.prenom,
      date_naissance: child.date_naissance || '',
      rgpd_consent_display_name: child.rgpd_consent_display_name || false
    })
    setShowAddForm(true)
  }

  const handleDelete = async (childId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet enfant ? Cette action est irréversible.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('children')
        .delete()
        .eq('id', childId)

      if (error) throw error
      toast.success('Enfant supprimé')
      loadChildren()
    } catch (err) {
      console.error('Error deleting child:', err)
      toast.error('Erreur lors de la suppression')
    }
  }

  const toggleConsent = async (child) => {
    try {
      const { error } = await supabase
        .from('children')
        .update({
          rgpd_consent_display_name: !child.rgpd_consent_display_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', child.id)

      if (error) throw error
      loadChildren()
      toast.success(
        child.rgpd_consent_display_name
          ? 'Le prénom ne sera plus affiché'
          : 'Le prénom sera affiché sur les plannings'
      )
    } catch (err) {
      console.error('Error toggling consent:', err)
      toast.error('Erreur lors de la modification')
    }
  }

  const calculateAge = (birthDate) => {
    if (!birthDate) return null
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }

    if (age < 1) {
      const months = (today.getFullYear() - birth.getFullYear()) * 12 + monthDiff
      return `${months} mois`
    }
    return `${age} an${age > 1 ? 's' : ''}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Mes enfants</h2>
          <p className="text-sm text-gray-500 mt-1">
            Gérez les informations de vos enfants pour les réservations
          </p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
          >
            + Ajouter un enfant
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-4">
            {editingChild ? 'Modifier un enfant' : 'Ajouter un enfant'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prénom *
                </label>
                <input
                  type="text"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  placeholder="Ex: Emma"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de naissance
                </label>
                <input
                  type="date"
                  value={formData.date_naissance}
                  onChange={(e) => setFormData({ ...formData, date_naissance: e.target.value })}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* RGPD Consent */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.rgpd_consent_display_name}
                  onChange={(e) => setFormData({ ...formData, rgpd_consent_display_name: e.target.checked })}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div>
                  <div className="font-medium text-gray-900">
                    Afficher le prénom sur les plannings
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    En cochant cette case, vous autorisez l'affichage du prénom de votre enfant
                    sur le planning de l'assistante maternelle. Cette information sera visible
                    par l'assistante et potentiellement par d'autres parents. Vous pouvez
                    retirer ce consentement à tout moment.
                  </div>
                </div>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : editingChild ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Children List */}
      {children.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-4xl mb-3">👶</div>
          <p className="text-gray-600 mb-4">
            Vous n'avez pas encore ajouté d'enfant
          </p>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Ajouter votre premier enfant
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {children.map((child) => (
            <div
              key={child.id}
              className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:shadow-sm transition"
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {child.prenom.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div>
                  <div className="font-semibold text-gray-800">{child.prenom}</div>
                  <div className="text-sm text-gray-500">
                    {child.date_naissance ? (
                      <>
                        {format(new Date(child.date_naissance), 'd MMMM yyyy', { locale: fr })}
                        {' '}
                        <span className="text-gray-400">({calculateAge(child.date_naissance)})</span>
                      </>
                    ) : (
                      'Date de naissance non renseignée'
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* RGPD Toggle */}
                <button
                  onClick={() => toggleConsent(child)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    child.rgpd_consent_display_name
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={child.rgpd_consent_display_name
                    ? 'Prénom visible sur les plannings'
                    : 'Prénom masqué sur les plannings'}
                >
                  {child.rgpd_consent_display_name ? '👁 Visible' : '🔒 Masqué'}
                </button>

                {/* Edit */}
                <button
                  onClick={() => handleEdit(child)}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="Modifier"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(child.id)}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Supprimer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RGPD Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
        <div className="font-medium text-gray-700 mb-2">Conformité RGPD</div>
        <p>
          Les prénoms de vos enfants peuvent être affichés sur les plannings des assistantes maternelles
          uniquement si vous en avez donné l'autorisation. Vous pouvez modifier ce paramètre à tout moment
          en cliquant sur le bouton "Visible" ou "Masqué" à côté de chaque enfant.
        </p>
      </div>
    </div>
  )
}
