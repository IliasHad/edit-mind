import { Scene } from '@shared/schemas'
import { logger } from '@shared/services/logger'
import { DetectedTextData, FaceData, ObjectData, TranscriptionWord } from '@shared/types/scene'
import { Metadata } from 'chromadb'
import { getAspectRatioDescription } from './aspectRatio'

const generateVectorDocumentText = async (scene: Scene) => {
  const faces = scene.faces?.join(', ') || ''
  const objects = scene.objects?.join(', ') || ''
  const emotionsText =
    scene.emotions
      ?.map((face) => (face.emotion ? `${face.name} is ${face.emotion} with ${Math.ceil(face.confidence)}% confidence` : ''))
      .filter(Boolean)
      .join(', ') || ''
  const detectedText = Array.isArray(scene.detectedText) ? scene.detectedText.join(', ') : scene.detectedText || ''

  const textParts: string[] = []

  // Shot type description
  if (scene.shotType) {
    const shotTypeDescriptions: Record<string, string> = {
      'close-up': 'a close-up shot',
      'medium-shot': 'a medium-shot scene',
      'long-shot': 'a wide-angle scene',
    }
    textParts.push(`This is ${shotTypeDescriptions[scene.shotType] || 'a ' + scene.shotType}`)
  } else {
    textParts.push('This is a video scene')
  }

  // Faces/people in the scene
  if (faces) {
    const faceList = scene.faces || []
    if (faceList.length === 1) {
      textParts.push(` featuring ${faces}`)
    } else if (faceList.length === 2) {
      textParts.push(` featuring ${faceList[0]} and ${faceList[1]}`)
    } else if (faceList.length > 2) {
      const lastFace = faceList[faceList.length - 1]
      const otherFaces = faceList.slice(0, -1).join(', ')
      textParts.push(` featuring ${otherFaces}, and ${lastFace}`)
    }
  }

  // Objects detected
  if (objects) {
    const objectList = scene.objects || []
    if (objectList.length === 1) {
      textParts.push(`. A ${objects} is visible in the scene`)
    } else if (objectList.length > 1) {
      textParts.push(`. Detected objects include ${objects}`)
    }
  }

  // Camera information
  if (scene.camera) {
    textParts.push(`, captured with ${scene.camera}`)
  }

  // Emotional analysis
  if (emotionsText) {
    textParts.push(`. Emotional analysis indicates that ${emotionsText}`)
  }

  // On-screen text
  if (detectedText) {
    textParts.push(`. On-screen text displays: "${detectedText}"`)
  }

  // Color palette
  if (scene.dominantColorName) {
    textParts.push(`. The scene has a ${scene.dominantColorName} color palette`)
  }

  // Transcription
  if (scene.transcription) {
    textParts.push(`. The transcription reads: "${scene.transcription}"`)
  }

  // Creation timestamp
  if (scene.createdAt) {
    textParts.push(`, captured at ${new Date(scene.createdAt).toISOString()}`)
  }

  // Aspect ratio
  if (scene.aspectRatio) {
    const aspectRatioDesc = getAspectRatioDescription(scene.aspectRatio)
    textParts.push(` in ${aspectRatioDesc} format`)
  }

  // Description
  if (scene.description) {
    textParts.push(` described as ${scene.description}`)
  }

  // Clean up and return
  const text = textParts.join('').replace(/\s+/g, ' ').replace(/\.\./g, '.').trim()

  return text
}

export const sceneToVectorFormat = async (scene: Scene) => {
  const detectedText = Array.isArray(scene.detectedText) ? scene.detectedText.join(', ') : scene.detectedText || ''

  const text = await generateVectorDocumentText(scene)

  const metadata: Metadata = {
    source: scene.source,
    thumbnailUrl: scene.thumbnailUrl || '',
    startTime: scene.startTime,
    endTime: scene.endTime,
    faces: scene.faces.join(', '),
    objects: scene.objects.join(', '),
    transcription: scene.transcription || '',
    emotions: JSON.stringify(scene.emotions || []),
    description: scene.description,
    shotType: scene.shotType,
    detectedText: detectedText,
    createdAt: scene.createdAt,
    location: scene.location,
    dominantColorHex: scene.dominantColorHex || null,
    dominantColorName: scene.dominantColorName || null,
    camera: scene.camera,
    duration: scene.duration || 0,
    facesData: JSON.stringify(scene.facesData || []),
    objectsData: JSON.stringify(scene.objectsData || []),
    detectedTextData: JSON.stringify(scene.detectedTextData || []),
    transcriptionWords: JSON.stringify(scene.transcriptionWords || []),
    aspectRatio: scene.aspectRatio,
  }

  return {
    id: scene.id,
    text,
    metadata,
  }
}

export const sanitizeMetadata = (metadata: Metadata): Record<string, string | number | boolean> => {
  const sanitized: Record<string, string | number | boolean> = {}

  for (const [key, value] of Object.entries(metadata)) {
    // Skip null, undefined, or complex objects
    if (value === null || value === undefined) {
      continue
    }

    // Handle different types
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value
    } else if (typeof value === 'object') {
      // Convert objects/arrays to JSON strings
      try {
        sanitized[key] = JSON.stringify(value)
      } catch (e) {
        logger.warn(`Failed to stringify metadata key ${key}: ${e}`)
      }
    } else {
      // Convert other types to strings
      sanitized[key] = String(value)
    }
  }

  return sanitized
}

export const validateDocument = (doc: { id: string; text: string; metadata?: any }): boolean => {
  // Must have an ID
  if (!doc.id || typeof doc.id !== 'string' || doc.id.trim() === '') {
    logger.warn('Document missing valid ID')
    return false
  }

  // Must have text content
  if (!doc.text || typeof doc.text !== 'string' || doc.text.trim() === '') {
    logger.warn(`Document ${doc.id} has no valid text content`)
    return false
  }

  return true
}

export const metadataToScene = (metadata: Record<string, unknown> | null, id: string, text?: string | null): Scene => {
  if (!metadata) {
    return {
      id: id,
      thumbnailUrl: '',
      startTime: 0,
      endTime: 0,
      faces: [],
      objects: [],
      transcription: '',
      description: '',
      shotType: '',
      emotions: [],
      createdAt: 0,
      source: '',
      camera: '',
      dominantColorName: '',
      dominantColorHex: '',
      detectedText: [],
      location: '',
      duration: 0,
      aspectRatio: '16:9',
    }
  }

  let emotions: Array<{ name: string; emotion: string; confidence: number }> = []
  try {
    const emotionsStr = metadata.emotions as string
    if (emotionsStr) {
      // Check if it's in "name:emotion,name:emotion" format
      if (emotionsStr.includes(':') && !emotionsStr.includes('{')) {
        emotions = emotionsStr
          .split(',')
          .map((s) => s.trim())
          .map((part) => {
            const [name, emotion] = part.split(':').map((s) => s.trim())
            return { name: name || 'unknown', emotion: emotion || 'neutral', confidence: 1 }
          })
      } else {
        // Otherwise, try parsing as JSON
        const parsed = JSON.parse(emotionsStr)
        if (Array.isArray(parsed)) {
          emotions = parsed.map((e) => ({
            name: e.name || 'unknown',
            emotion: e.emotion || 'neutral',
            confidence: parseFloat(e.emotion) || 0,
          }))
        }
      }
    }
  } catch {
    emotions = []
  }

  const faces = metadata.faces
    ? (metadata.faces as string)
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean)
    : []
  const objects = metadata.objects
    ? (metadata.objects as string)
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    : []
  const detectedText = metadata.detectedText
    ? (metadata.detectedText as string)
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    : []
  let facesData: FaceData[] = []
  try {
    facesData = metadata.facesData ? JSON.parse(metadata.facesData as string) : []
  } catch (e) {
    logger.warn('Failed to parse facesData: ' + e)
  }

  let objectsData: ObjectData[] = []
  try {
    objectsData = metadata.objectsData ? JSON.parse(metadata.objectsData as string) : []
  } catch (e) {
    logger.warn('Failed to parse objectsData: ' + e)
  }

  let detectedTextData: DetectedTextData[] = []
  try {
    detectedTextData = metadata.detectedTextData ? JSON.parse(metadata.detectedTextData as string) : []
  } catch (e) {
    logger.warn('Failed to parse detectedTextData: ' + e)
  }

  let transcriptionWords: TranscriptionWord[] = []
  try {
    transcriptionWords = metadata.transcriptionWords ? JSON.parse(metadata.transcriptionWords as string) : []
  } catch (e) {
    logger.warn('Failed to parse transcriptionWords: ' + e)
  }

  return {
    id: id,
    thumbnailUrl: metadata.thumbnailUrl?.toString() || '',
    startTime: parseInt(metadata.startTime?.toString() || '0') || 0,
    endTime: parseInt(metadata.endTime?.toString() || '0') || 0,
    faces,
    objects,
    transcription: metadata.transcription?.toString() || '',
    description: metadata.description?.toString() || '',
    shotType: metadata.shotType?.toString() || '',
    emotions,
    createdAt: parseInt(metadata.createdAt?.toString() || '0'),
    source: metadata.source?.toString() || '',
    camera: metadata.camera?.toString() || 'Unknown Camera',
    dominantColorHex: metadata.dominantColor?.toString() || metadata.dominantColorHex?.toString() || 'Unknown',
    dominantColorName: metadata.dominantColorName?.toString() || 'Unknown',
    detectedText,
    location: metadata.location?.toString() || 'Unknown Location',
    duration: parseInt(metadata.duration?.toString() || '0'),
    detectedTextData,
    transcriptionWords,
    objectsData,
    facesData,
    aspectRatio: metadata.aspectRatio?.toString() || '16:9',
    text: text ?? undefined,
  }
}

export function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}


export const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
    )
  ])
}
