import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { logger } from '../../utils/logger'
import { translateAuthError } from './authErrors'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const { requestPasswordReset } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await requestPasswordReset(email)
      setSubmitted(true)
    } catch (err) {
      logger.error('🔑 ForgotPasswordForm: Error:', err)
      setError(translateAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink mb-4"
        >
          <span aria-hidden="true">←</span>
          Retour à l'accueil
        </Link>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-ink mb-2">Mot de passe oublié</h1>
          <p className="text-muted">
            {submitted
              ? 'Vérifiez votre boîte de réception.'
              : 'Entrez votre email pour recevoir un lien de réinitialisation.'}
          </p>
        </div>

        {error && (
          <div className="bg-error/10 border border-error/30 text-error px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {submitted ? (
          <div className="bg-success/10 border border-success/30 text-success px-4 py-3 rounded-lg mb-4">
            Si un compte existe avec cet email, vous recevrez un lien de réinitialisation dans quelques minutes.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent"
                placeholder="vous@exemple.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white py-3 md:py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed text-base active:scale-98"
            >
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="text-primary hover:text-primary/80 font-medium">
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  )
}
