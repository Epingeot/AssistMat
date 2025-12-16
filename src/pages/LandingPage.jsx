import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LandingPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [searchCity, setSearchCity] = useState('')

  // If user is already logged in, redirect to dashboard
  const handleDashboardClick = () => {
    navigate('/dashboard')
  }

  const handleSearch = (e) => {
    e.preventDefault()
    // Navigate to search page with city or postal code as query param
    // Check if input looks like a postal code (5 digits)
    const isPostalCode = /^\d{5}$/.test(searchCity.trim())
    if (isPostalCode) {
      navigate(`/search?codePostal=${encodeURIComponent(searchCity.trim())}`)
    } else if (searchCity) {
      navigate(`/search?ville=${encodeURIComponent(searchCity.trim())}`)
    } else {
      navigate('/search')
    }
  }

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-purple-600">AssistMat</h1>
          <div className="flex items-center gap-4">
            {user ? (
              <button
                onClick={handleDashboardClick}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
              >
                Mon espace
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-purple-600 font-medium"
                >
                  Connexion
                </Link>
                <Link
                  to="/login"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
                >
                  Inscription
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-600 to-pink-500 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Trouvez l'assistante maternelle idéale
          </h2>
          <p className="text-xl md:text-2xl mb-10 opacity-90">
            Recherchez, comparez et réservez en quelques clics
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                placeholder="Entrez votre ville ou code postal..."
                className="flex-1 px-5 py-4 rounded-lg text-gray-800 text-lg focus:ring-4 focus:ring-purple-300 outline-none"
              />
              <button
                type="submit"
                className="px-8 py-4 bg-yellow-400 text-gray-900 rounded-lg font-bold text-lg hover:bg-yellow-300 transition shadow-lg"
              >
                Rechercher
              </button>
            </div>
          </form>

          <p className="mt-6 text-sm opacity-75">
            Plus de 100 assistantes maternelles disponibles près de chez vous
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Pourquoi choisir AssistMat ?
          </h3>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-800 mb-3">Avis et notes</h4>
              <p className="text-gray-600">
                Consultez les avis et notes laissés par d'autres parents pour choisir en toute confiance.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-800 mb-3">Reservation simple</h4>
              <p className="text-gray-600">
                Consultez les disponibilités en temps réel et envoyez une demande de réservation en quelques clics.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-800 mb-3">Recherche locale</h4>
              <p className="text-gray-600">
                Trouvez des assistantes maternelles près de chez vous grâce à notre carte interactive.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Comment ça marche ?
          </h3>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative">
              <div className="bg-white rounded-lg p-6 shadow-md">
                <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-lg mb-4">
                  1
                </div>
                <h4 className="text-xl font-semibold text-gray-800 mb-3">Recherchez</h4>
                <p className="text-gray-600">
                  Entrez votre ville et trouvez des assistantes maternelles disponibles près de chez vous.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="bg-white rounded-lg p-6 shadow-md">
                <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-lg mb-4">
                  2
                </div>
                <h4 className="text-xl font-semibold text-gray-800 mb-3">Comparez</h4>
                <p className="text-gray-600">
                  Consultez les profils, les disponibilités et choisissez l'assistante idéale.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="bg-white rounded-lg p-6 shadow-md">
                <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-lg mb-4">
                  3
                </div>
                <h4 className="text-xl font-semibold text-gray-800 mb-3">Reservez</h4>
                <p className="text-gray-600">
                  Envoyez une demande de réservation et attendez la confirmation de l'assistante.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section - TODO: Uncomment when we have real testimonials
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Ce que disent nos utilisateurs
          </h3>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-600 italic mb-4">
                "Testimonial text here"
              </p>
              <p className="font-semibold text-gray-800">Name</p>
              <p className="text-sm text-gray-500">Role / Location</p>
            </div>
          </div>
        </div>
      </section>
      */}

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-purple-600 to-pink-500 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl md:text-4xl font-bold mb-6">
            Prêt à trouver votre assistante maternelle ?
          </h3>
          <p className="text-xl mb-8 opacity-90">
            Rejoignez des milliers de familles qui font confiance à AssistMat
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/search"
              className="px-8 py-4 bg-yellow-400 text-gray-900 rounded-lg font-bold text-lg hover:bg-yellow-300 transition shadow-lg"
            >
              Commencer la recherche
            </Link>
            {!user && (
              <Link
                to="/login"
                className="px-8 py-4 bg-white/20 text-white rounded-lg font-bold text-lg hover:bg-white/30 transition border-2 border-white/50"
              >
                Créer un compte gratuit
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <h4 className="text-xl font-bold text-white mb-2">AssistMat</h4>
            <p className="text-sm">La plateforme de mise en relation parents / assistantes maternelles</p>
          </div>
          <div className="flex gap-6 text-sm">
            <Link to="/disclaimer" className="hover:text-white transition">Mentions legales</Link>
            <a href="mailto:contact@assistmat.fr" className="hover:text-white transition">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
