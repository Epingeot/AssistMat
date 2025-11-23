import { useAuth } from '../contexts/AuthContext'

export default function HomePage() {
  const { user, profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">
            AssistMat
          </h1>
          <button
            onClick={signOut}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Déconnexion
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">
            Bienvenue, {profile?.prenom} !
          </h2>
          <div className="space-y-2">
            <p><strong>Email :</strong> {user?.email}</p>
            <p><strong>Rôle :</strong> {profile?.role === 'assistante' ? 'Assistante Maternelle' : 'Parent'}</p>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-blue-800">
              ✅ Authentification fonctionne !<br/>
              Prochaine étape : {profile?.role === 'assistante' 
                ? 'Dashboard assistante' 
                : 'Page de recherche'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}