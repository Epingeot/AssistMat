import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix pour les icônes Leaflet avec Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

// Composant pour recentrer la carte quand les assistantes changent
function MapUpdater({ center, assistantes }) {
  const map = useMap()
  
  useEffect(() => {
    if (assistantes.length > 0 && assistantes[0].latitude) {
      // Calculer les bounds de tous les marqueurs
      const bounds = assistantes
        .filter(a => a.latitude && a.longitude)
        .map(a => [a.latitude, a.longitude])
      
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
      }
    } else if (center) {
      map.setView(center, 12)
    }
  }, [assistantes, center, map])
  
  return null
}

export default function MapView({ assistantes, searchCenter, onSelectAssistante }) {
  // Centre par défaut : Paris
  const defaultCenter = [48.8566, 2.3522]

  // Use search center if available, otherwise use default
  const center = searchCenter || defaultCenter

  return (
    <div className="h-full w-full rounded-lg overflow-hidden shadow-lg">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={true}
        className="h-full w-full"
        style={{ zIndex: 1 }}
      >
      
        <TileLayer
          attribution='Tiles &copy; Esri'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />
            
        <MapUpdater center={center} assistantes={assistantes} />
        
        {assistantes.map((assistante) => {
          if (!assistante.latitude || !assistante.longitude) return null
          
          // Position du marker : [latitude, longitude]
          const position = [assistante.latitude, assistante.longitude]
          
          return (
            <Marker
              key={assistante.id}
              position={position}
            >
              <Popup>
                <div className="text-sm min-w-[200px]">
                  {/* Photo */}
                  {assistante.photo_url && (
                    <div className="flex justify-center mb-2">
                      <img
                        src={assistante.photo_url}
                        alt={`${assistante.prenom} ${assistante.nom}`}
                        className="w-16 h-16 rounded-full object-cover border-2 border-purple-200"
                      />
                    </div>
                  )}

                  <p className="font-bold text-center">{assistante.prenom} {assistante.nom}</p>
                  <div className="text-gray-600 text-xs">{assistante.adresse}</div>
                  <div className="text-gray-600 text-xs">{assistante.code_postal} {assistante.ville}</div>

                  {assistante.max_kids && (
                    <p className="text-purple-600 font-semibold mt-2">
                      {assistante.max_kids} enfant{assistante.max_kids > 1 ? 's' : ''} max
                    </p>
                  )}

                  <div className="text-sm text-gray-500 flex gap-2 flex-wrap">
                    {assistante.accepts_periscolaire && <span className="text-blue-600">Périscolaire</span>}
                    {assistante.accepts_remplacements && <span className="text-orange-600">Remplacements</span>}
                  </div>

                  {/* Additional info badges */}
                  {(assistante.has_garden || assistante.has_pets) && (
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {assistante.has_garden && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                          🌳 Jardin
                        </span>
                      )}
                      {assistante.has_pets && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                          🐾 Animaux
                        </span>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => onSelectAssistante(assistante)}
                    className="mt-2 w-full bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                  >
                    Réserver
                  </button>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}