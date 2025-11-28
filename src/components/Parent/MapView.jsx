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
              eventHandlers={{
                click: () => {
                  onSelectAssistante(assistante)
                }
              }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-bold">{assistante.prenom} {assistante.nom}</p>
                  <div className="text-gray-600 text-xs">{assistante.adresse}</div>
                  <div className="text-gray-600 text-xs">{assistante.code_postal} {assistante.ville}</div>
                  <p className="text-purple-600 font-semibold mt-2">
                    {assistante.places_disponibles} places disponibles
                  </p>
                  <p className="text-sm text-gray-500">
                    {assistante.tarif_journalier}€/jour
                  </p>
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