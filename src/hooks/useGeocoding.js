import { useState } from 'react'
import axios from 'axios'

export function useGeocoding() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const geocodeAddress = async (adresse, codePostal, ville) => {
    setLoading(true)
    setError(null)

    try {
      const query = adresse 
        ? `${adresse} ${codePostal} ${ville}`
        : `${codePostal} ${ville}`
      
      console.log('Geocoding query:', query)
      
      const response = await axios.get('https://api-adresse.data.gouv.fr/search/', {
        params: {
          q: query,
          limit: 1,
          autocomplete: 0
        }
      })

      if (!response.data.features || response.data.features.length === 0) {
        throw new Error('Adresse non trouvée. Vérifiez l\'orthographe.')
      }

      const feature = response.data.features[0]
      const coords = feature.geometry.coordinates
      
      console.log('Geocoding result:', {
        label: feature.properties.label,
        lat: coords[1],
        lon: coords[0],
        score: feature.properties.score
      })

      return {
        longitude: coords[0],
        latitude: coords[1]
      }
    } catch (err) {
      console.error('Geocoding error:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { geocodeAddress, loading, error }
}