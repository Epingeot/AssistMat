import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function AssistanteLandingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleDashboardClick = () => {
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-primary hover:opacity-80 transition">
            AssistMat
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <button
                onClick={handleDashboardClick}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-semibold"
              >
                Mon espace
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-muted hover:text-primary font-medium"
                >
                  Connexion
                </Link>
                <Link
                  to="/login?mode=signup"
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-semibold"
                >
                  Inscription
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-azure to-info text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Gagnez en visibilité auprès des parents
          </h2>
          <p className="text-xl md:text-2xl mb-10 opacity-90">
            Créez votre profil, affichez vos disponibilités et recevez des demandes de mise en relation.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/login?mode=signup"
              className="px-8 py-4 bg-accent text-ink rounded-lg font-bold text-lg hover:bg-accent/90 transition shadow-lg"
            >
              Créer mon profil
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 bg-white/20 text-white rounded-lg font-bold text-lg hover:bg-white/30 transition border-2 border-white/50"
            >
              Se connecter
            </Link>
          </div>

          <p className="mt-6 text-sm opacity-75">
            Inscription gratuite, sans engagement
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-ink mb-12">
            Pourquoi rejoindre AssistMat&nbsp;?
          </h3>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 — Visibility */}
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-ink mb-3">Plus de visibilité</h4>
              <p className="text-muted">
                Apparaissez dans les résultats des parents qui cherchent près de chez vous.
              </p>
            </div>

            {/* Feature 2 — Planning */}
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-ink mb-3">Planning clair</h4>
              <p className="text-muted">
                Renseignez vos horaires, vos absences et votre capacité d'accueil&nbsp;: votre disponibilité s'affiche automatiquement.
              </p>
            </div>

            {/* Feature 3 — Demandes */}
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-ink mb-3">Demandes centralisées</h4>
              <p className="text-muted">
                Recevez les demandes de mise en relation, échangez avec les parents et finalisez directement depuis votre espace.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-chip">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-ink mb-12">
            Comment ça marche&nbsp;?
          </h3>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative">
              <div className="bg-white rounded-lg p-6 shadow-md h-full">
                <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold text-lg mb-4">
                  1
                </div>
                <h4 className="text-xl font-semibold text-ink mb-3">Créez votre profil</h4>
                <p className="text-muted">
                  Adresse, agrément, capacité d'accueil, options&nbsp;: présentez-vous aux parents en quelques minutes.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="bg-white rounded-lg p-6 shadow-md h-full">
                <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold text-lg mb-4">
                  2
                </div>
                <h4 className="text-xl font-semibold text-ink mb-3">Tenez votre planning à jour</h4>
                <p className="text-muted">
                  Horaires de travail, semaines d'absence&nbsp;: votre calendrier reflète vos vraies disponibilités.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="bg-white rounded-lg p-6 shadow-md h-full">
                <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold text-lg mb-4">
                  3
                </div>
                <h4 className="text-xl font-semibold text-ink mb-3">Recevez les demandes</h4>
                <p className="text-muted">
                  Les parents vous contactent via la plateforme. Vous échangez, vous acceptez, la mise en relation est finalisée.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-azure to-info text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl md:text-4xl font-bold mb-6">
            Prête à rejoindre AssistMat&nbsp;?
          </h3>
          <p className="text-xl mb-8 opacity-90">
            Créez votre profil gratuitement et recevez vos premières demandes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/login?mode=signup"
              className="px-8 py-4 bg-accent text-ink rounded-lg font-bold text-lg hover:bg-accent/90 transition shadow-lg"
            >
              Créer mon profil
            </Link>
            {!user && (
              <Link
                to="/login"
                className="px-8 py-4 bg-white/20 text-white rounded-lg font-bold text-lg hover:bg-white/30 transition border-2 border-white/50"
              >
                Se connecter
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-ink text-subtle">
        {/* Parent audience row */}
        <div className="border-b border-white/10 py-5 px-4">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-white text-center sm:text-left text-sm">
              <span className="font-semibold">Vous êtes parent&nbsp;?</span>{' '}
              <span className="text-subtle">Trouvez une assistante maternelle près de chez vous.</span>
            </p>
            <Link
              to="/"
              className="shrink-0 px-5 py-2 bg-secondary text-white rounded-lg font-semibold text-sm hover:bg-secondary/90 transition"
            >
              Découvrir l'espace parents →
            </Link>
          </div>
        </div>

        {/* Legal row */}
        <div className="py-4 px-4">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="text-center md:text-left">
              <h4 className="text-lg font-bold text-white">AssistMat</h4>
              <p className="text-sm">La plateforme de mise en relation parents / assistantes maternelles</p>
            </div>
            <div className="flex gap-6 text-sm">
              <Link to="/disclaimer" className="hover:text-white transition">Mentions legales</Link>
              <a href="mailto:contact@assistmat.fr" className="hover:text-white transition">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
