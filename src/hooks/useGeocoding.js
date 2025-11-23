import { useState } from 'react'
import axios from 'axios'

export function useGeocoding() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const geocodeAddress = async (adresse, codePostal, ville) => {
    setLoading(true)
    setError(null)

    try {
      // Utiliser l'API Nominatim (OpenStreetMap) - gratuite
      const fullAddress = `${adresse}, ${codePostal} ${ville}, France`
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: fullAddress,
          format: 'json',
          limit: 1,
          countrycodes: 'fr'
        },
        headers: {
          'User-Agent': 'AssistMat-App'
        }
      })

      if (response.data && response.data.length > 0) {
        const { lat, lon } = response.data[0]
        return {
          latitude: parseFloat(lat),
          longitude: parseFloat(lon)
        }
      } else {
        throw new Error('Adresse non trouvée')
      }
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { geocodeAddress, loading, error }
}