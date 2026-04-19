import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { logger } from '../../utils/logger'
import { PASSWORD_MIN_LENGTH, passwordRules } from './passwordPolicy'
import { translateAuthError } from './authErrors'

export default function ResetPasswordForm() {
  const navigate = useNavigate()
  const { user, loading: authLoading, updatePassword } = useAuth()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const allRulesPass = passwordRules.every((rule) => rule.test(password))
  const passwordsMatch = password === confirm && password.length > 0
  const canSubmit = allRulesPass && passwordsMatch && !submitting

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return

    setError(null)
    setSubmitting(true)

    try {
      await updatePassword(password)
      setSuccess(true)
      setTimeout(() => navigate('/dashboard', { replace: true }), 1500)
    } catch (err) {
      logger.error('🔑 ResetPasswordForm: Error:', err)
      setError(translateAuthError(err))
    } finally {
      setSubmitting(false)
    }
  }

  // Wait for the SDK to finish processing the recovery token from the URL.
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-xl font-semibold text-muted">Chargement...</div>
      </div>
    )
  }

  // No session means the recovery link was missing, invalid, or expired.
  if (!user && !success) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-ink mb-2">Lien invalide</h1>
            <p className="text-muted">
              Ce lien de réinitialisation est invalide ou a expiré.
            </p>
          </div>
          <Link
            to="/forgot-password"
            className="block w-full text-center bg-primary hover:bg-primary/90 text-white py-3 rounded-lg font-semibold transition"
          >
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-ink mb-2">Nouveau mot de passe</h1>
          <p className="text-muted">
            {success
              ? 'Mot de passe modifié. Redirection...'
              : 'Choisissez un nouveau mot de passe pour votre compte.'}
          </p>
        </div>

        {error && (
          <div className="bg-error/10 border border-error/30 text-error px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {success ? (
          <div className="bg-success/10 border border-success/30 text-success px-4 py-3 rounded-lg mb-4">
            Votre mot de passe a été modifié avec succès.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={PASSWORD_MIN_LENGTH}
                autoComplete="new-password"
                className="w-full px-4 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent"
                placeholder="••••••••"
              />
              <ul className="mt-2 space-y-0.5 text-xs">
                {passwordRules.map((rule) => {
                  const ok = rule.test(password)
                  return (
                    <li
                      key={rule.label}
                      className={ok ? 'text-success' : 'text-muted'}
                    >
                      {ok ? '✓' : '○'} {rule.label}
                    </li>
                  )
                })}
              </ul>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-4 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent"
                placeholder="••••••••"
              />
              {confirm.length > 0 && !passwordsMatch && (
                <p className="mt-1 text-xs text-error">Les mots de passe ne correspondent pas.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full bg-primary hover:bg-primary/90 text-white py-3 md:py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed text-base active:scale-98"
            >
              {submitting ? 'Modification...' : 'Modifier le mot de passe'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
