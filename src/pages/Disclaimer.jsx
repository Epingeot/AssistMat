import { useNavigate } from 'react-router-dom'

export default function Disclaimer() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Mentions Légales et Avertissement
          </h1>
        </div>

        <div className="prose prose-sm md:prose-base max-w-none">
          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p className="font-semibold text-gray-900">
              Cette application met uniquement en relation des parents et des assistant(e)s maternel(le)s agréé(e)s.
            </p>

            <p>
              Elle ne recrute pas, n'emploie pas et ne rémunère pas les assistant(e)s maternel(le)s.
            </p>

            <p>
              Les informations affichées (disponibilités, tarifs, horaires, agrément, présentation) sont déclarées directement par les assistant(e)s maternel(le)s, qui en sont seules responsables.
            </p>

            <p>
              Les réservations effectuées via l'application sont indicatives et non contractuelles.
              Le contrat de travail, les déclarations Pajemploi et toutes les obligations légales doivent être établis directement entre les parents et l'assistant(e) maternel(le).
            </p>

            <p>
              L'application ne collecte ni ne traite de données sensibles concernant les enfants.
            </p>

            <p className="font-semibold text-gray-900">
              En utilisant ce service, vous acceptez nos Conditions d'Utilisation et notre Politique de Confidentialité.
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition"
          >
            Retour
          </button>
        </div>
      </div>
    </div>
  )
}
