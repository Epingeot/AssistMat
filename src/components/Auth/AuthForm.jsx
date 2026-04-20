import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { logger } from '../../utils/logger'
import { PASSWORD_MIN_LENGTH, passwordRules } from './passwordPolicy'
import { translateAuthError } from './authErrors'
import PasswordInput from './PasswordInput'

export default function AuthForm() {
  const [searchParams] = useSearchParams()
  const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [role, setRole] = useState('parent')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [signupSuccess, setSignupSuccess] = useState(false)

  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    logger.log('🔐 AuthForm: Starting authentication...')

    try {
      if (isLogin) {
        logger.log('🔐 AuthForm: Calling signIn...')
        const result = await signIn(email, password)
        logger.log('🔐 AuthForm: signIn result:', result)
        setMessage('Connexion réussie !')
      } else {
        await signUp(email, password, role, nom, prenom)
        setSignupSuccess(true)
      }
    } catch (err) {
      logger.error('🔐 AuthForm: Error:', err)
      setError(translateAuthError(err))
    } finally {
      setLoading(false)
      logger.log('🔐 AuthForm: Done')
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
          <h1 className="text-3xl font-bold text-ink mb-2">
            {isLogin ? 'Connexion' : 'Inscription'}
          </h1>
          <p className="text-muted">
            {isLogin 
              ? 'Connectez-vous à votre compte' 
              : 'Créez votre compte'}
          </p>
        </div>

        {error && (
          <div className="bg-error/10 border border-error/30 text-error px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {signupSuccess ? (
          <div className="space-y-4">
            <div className="bg-success/10 border border-success/30 text-success px-4 py-3 rounded-lg">
              Inscription réussie ! Cliquez sur le lien dans l'email que nous venons de vous envoyer pour confirmer votre compte et vous connecter.
            </div>
            <p className="text-center text-muted text-sm">
              Pensez à vérifier vos courriers indésirables si vous ne le voyez pas.
            </p>
            <Link
              to="/"
              className="block text-center text-primary hover:text-primary/80 font-medium"
            >
              Retour à l'accueil
            </Link>
          </div>
        ) : (
          <>
        {message && (
          <div className="bg-success/10 border border-success/30 text-success px-4 py-3 rounded-lg mb-4">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  Rôle
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('parent')}
                    className={`p-3 rounded-lg border-2 transition ${
                      role === 'parent'
                        ? 'border-secondary bg-secondary/10 text-secondary'
                        : 'border-hairline text-muted hover:border-line'
                    }`}
                  >
                    👨‍👩‍👧 Parent
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('assistante')}
                    className={`p-3 rounded-lg border-2 transition ${
                      role === 'assistante'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-hairline text-muted hover:border-line'
                    }`}
                  >
                    👶 Assistante
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    required
                    autoComplete="given-name"
                    className="w-full px-4 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    required
                    autoComplete="family-name"
                    className="w-full px-4 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              Email
            </label>
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

          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              Mot de passe
            </label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={PASSWORD_MIN_LENGTH}
              autoComplete={isLogin ? "current-password" : "new-password"}
              placeholder="••••••••"
            />
            {!isLogin && (
              <ul className="mt-2 space-y-0.5 text-xs">
                {passwordRules.map((rule) => {
                  const ok = rule.test(password)
                  return (
                    <li
                      key={rule.label}
                      className={ok ? 'text-success' : 'text-subtle'}
                    >
                      {ok ? '✓' : '○'} {rule.label}
                    </li>
                  )
                })}
              </ul>
            )}
            {isLogin && (
              <div className="mt-2 text-right">
                <Link
                  to="/forgot-password"
                  className="text-sm text-peach hover:text-peach/80"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white py-3 md:py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed text-base active:scale-98"
          >
            {loading ? 'Chargement...' : isLogin ? 'Se connecter' : "S'inscrire"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin)
              setError(null)
              setMessage(null)
            }}
            className="text-primary hover:text-primary/80 font-medium"
          >
            {isLogin
              ? "Pas de compte ? S'inscrire"
              : 'Déjà un compte ? Se connecter'}
          </button>
        </div>
          </>
        )}

        <div className="mt-4 text-center text-sm text-subtle">
          <Link
            to="/disclaimer"
            className="hover:text-muted underline"
          >
            Mentions légales et avertissement
          </Link>
        </div>
      </div>
    </div>
  )
}