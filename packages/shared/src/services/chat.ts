import { ChatSuggestion } from '@shared/types/chat'
import { VideoMetadataSummary } from '@shared/types/search'

const isValidLocation = (locationName: string): boolean => {
  const invalidLocations = ['unknown', 'unidentified', 'not specified', 'n/a', '°n', '°r']
  return !invalidLocations.some((invalid) => locationName.toLowerCase().includes(invalid))
}

const isValidCamera = (cameraName: string): boolean => {
  const invalidCameras = ['unknown', 'unidentified', 'not specified', 'n/a', 'default', 'none', 'lavf']
  const normalized = cameraName.toLowerCase().trim()

  // Check if it's an invalid camera name
  if (invalidCameras.some((invalid) => normalized.includes(invalid))) {
    return false
  }

  // Check if it's just a number or generic identifier
  if (/^(camera\s*)?\d+$/.test(normalized)) {
    return false
  }

  return normalized.length > 0
}

export const generateChatSuggestions = (metadataSummary: VideoMetadataSummary): ChatSuggestion[] => {
  const suggestions: ChatSuggestion[] = []

  const { topFaces, shotTypes, topObjects, topLocations, cameras } = metadataSummary

  // Face + Positive Emotion suggestion
  if (topFaces?.length) {
    const hasMultipleWords = topFaces[0].name.includes(' ')
    suggestions.push({
      text: `Generate me a compilation of moments with @${hasMultipleWords ? `[${topFaces[0].name}]` : topFaces[0].name}`,
      icon: '🎭',
      category: 'people',
      border: 'border-pink-500',
    })
  }

  // Valid Location suggestion
  const validLocation = topLocations?.find((loc) => isValidLocation(loc.name))
  if (validLocation) {
    suggestions.push({
      text: `Give me all scenes from ${validLocation.name} location name`,
      icon: '📍',
      category: 'scene',
      border: 'border-emerald-500',
    })
  }

  // Object + Shot Type suggestion
  if (topObjects?.length && shotTypes?.length) {
    const shotTypeName = shotTypes[0].name.replace('-', ' ')
    suggestions.push({
      text: `How many video scenes ${shotTypeName} shots where ${topObjects[0].name} appeared?`,
      icon: '🎥',
      category: 'scene',
      border: 'border-orange-500',
    })
  }

  const validCamera =
    cameras?.slice(1).find((cam) => isValidCamera(cam.name)) ||
    (cameras?.length && isValidCamera(cameras[0].name) ? cameras[0] : null)

  if (validCamera) {
    suggestions.push({
      text: `Generate me a complication of shot with ${validCamera.name} camera`,
      icon: '📹',
      category: 'scene',
      border: 'border-blue-500',
    })
  }
  return suggestions.slice(0, 4)
}
