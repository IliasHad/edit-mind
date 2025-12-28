import fetch from 'node-fetch'
import * as fs from 'fs/promises'
import { CACHE_FILE, CACHE_DURATION } from '../constants'
import { logger } from '../services/logger'

interface LocationCache {
  [key: string]: {
    name: string
    timestamp: number
  }
}

export const formatLocation = (lat: number | undefined, lon: number | undefined, alt: number | undefined): string => {
  if (lat === undefined || lon === undefined) return ''

  const latDir = lat >= 0 ? 'N' : 'S'
  const lonDir = lon >= 0 ? 'E' : 'W'
  const latAbs = Math.abs(lat).toFixed(6)
  const lonAbs = Math.abs(lon).toFixed(6)

  let locationStr = `${latAbs}°${latDir}, ${lonAbs}°${lonDir}`

  if (alt !== undefined) {
    const altNum = typeof alt === 'number' ? alt : Number(alt)
    if (!isNaN(altNum)) {
      locationStr += ` (${altNum.toFixed(1)}m)`
    }
  }

  return locationStr
}

/*
 **
 * Parse formatted location string back to coordinates
 * Supports formats:
 * - "37.123456°N, 122.123456°W"
 * - "37.123456°N, 122.123456°W (100.0m)"
 * - "37.123456, -122.123456"
 */
export function parseLocation(locationStr: string): { lat: number; lon: number } | null {
  if (!locationStr) return null

  // Try format with N/S/E/W
  const degreeMatch = locationStr.match(/(-?\d+\.?\d*)°([NS]),\s*(-?\d+\.?\d*)°([EW])/i)
  if (degreeMatch) {
    let lat = parseFloat(degreeMatch[1])
    let lon = parseFloat(degreeMatch[3])

    // Apply direction
    if (degreeMatch[2].toUpperCase() === 'S') lat = -lat
    if (degreeMatch[4].toUpperCase() === 'W') lon = -lon

    return { lat, lon }
  }

  // Try simple decimal format
  const decimalMatch = locationStr.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/)
  if (decimalMatch) {
    return {
      lat: parseFloat(decimalMatch[1]),
      lon: parseFloat(decimalMatch[2]),
    }
  }

  return null
}

async function loadCache(): Promise<LocationCache> {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return {}
  }
}

async function saveCache(cache: LocationCache): Promise<void> {
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8')
}

interface NominatimResponse {
  display_name: string
  address?: {
    city?: string
    town?: string
    village?: string
    hamlet?: string
    country?: string
  }
}

export async function getLocationName(location: string): Promise<string> {
  const locationData = parseLocation(location)

  if (!locationData || !locationData.lat || !locationData.lon) {
    return location
  }

  const lat = Number(locationData.lat)
  const lon = Number(locationData.lon)

  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return location
  }

  const cacheKey = `${lat.toFixed(6)},${lon.toFixed(6)}`

  const cache = await loadCache()
  if (cache[cacheKey]) {
    const cached = cache[cacheKey]
    const age = Date.now() - cached.timestamp
    if (age < CACHE_DURATION) {
      return cached.name
    }
  }

  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&accept-language=en`

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'EditMind-VideoEditor/1.0',
    },
  })

  if (!response.ok) {
    const errorBody = await response.text()
    logger.error('Geocoding failed: ' + errorBody)
    throw new Error(`Geocoding failed: ${response.status} - ${errorBody}`)
  }

  const data = (await response.json()) as NominatimResponse

  let locationName: string

  if (data && data.address) {
    const addr = data.address
    const city = addr.city || addr.town || addr.village || addr.hamlet
    const country = addr.country

    if (city && country) {
      locationName = `${city}, ${country}`
    } else if (country) {
      locationName = country
    } else {
      locationName = data.display_name
    }
  } else {
    locationName = formatLocation(lat, lon, undefined)
  }

  cache[cacheKey] = {
    name: locationName,
    timestamp: Date.now(),
  }
  await saveCache(cache)

  return locationName
}
