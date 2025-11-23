export default function JoursSemaine({ selectedJours, onChange }) {
  const jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi']

  const toggleJour = (jour) => {
    if (selectedJours.includes(jour)) {
      onChange(selectedJours.filter(j => j !== jour))
    } else {
      onChange([...selectedJours, jour])
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Jours ouvrables
      </label>
      <div className="grid grid-cols-5 gap-2">
        {jours.map(jour => (
          <button
            key={jour}
            type="button"
            onClick={() => toggleJour(jour)}
            className={`p-3 rounded-lg border-2 transition capitalize ${
              selectedJours.includes(jour)
                ? 'border-purple-500 bg-purple-50 text-purple-700 font-semibold'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {jour.substring(0, 3)}
          </button>
        ))}
      </div>
    </div>
  )
}