import type { Scene } from '@shared/types'
import { logger } from '@shared/services/logger'
import type { DetectedTextData, FaceData, ObjectData, TranscriptionWord } from '@shared/types/scene'
import type { Metadata } from 'chromadb'
import { getAspectRatioDescription } from './aspectRatio'
import { basename, dirname } from 'path'
import { DEFAULT_LANGUAGE, type AppLanguage } from '@shared/types/language'

const joinWithAnd = (values: string[], language: AppLanguage) => {
  if (values.length <= 1) return values.join('')
  if (values.length === 2) return values.join(language === 'ru' ? ' и ' : ' and ')

  const last = values[values.length - 1]
  const rest = values.slice(0, -1).join(', ')
  return language === 'ru' ? `${rest} и ${last}` : `${rest}, and ${last}`
}

const RU_OBJECT_LABELS: Record<string, string> = {
  dog: 'собака',
  cat: 'кошка',
  door: 'дверь',
  person: 'человек',
  trailer: 'трейлер',
}

const RU_SHOT_TYPES: Record<string, string> = {
  'close-up': 'крупный план',
  'medium-shot': 'средний план',
  'long-shot': 'общий план',
}

const RU_EMOTIONS: Record<string, string> = {
  happy: 'счастливый',
  sad: 'грустный',
  neutral: 'нейтральный',
  angry: 'сердитый',
  surprised: 'удивлённый',
}

const localizeRuValue = (value: string, dictionary: Record<string, string>) =>
  dictionary[value.trim().toLocaleLowerCase('en-US')] ?? value

const generateVectorDocumentText = async (scene: Scene, language: AppLanguage = DEFAULT_LANGUAGE) => {
  const faces = scene.faces?.join(', ') || ''
  const objectList = scene.objects || []
  const localizedObjectList = language === 'ru' ? objectList.map((object) => localizeRuValue(object, RU_OBJECT_LABELS)) : objectList
  const objects = localizedObjectList.join(', ')
  const emotionsText =
    scene.emotions
      ?.map((face) =>
        face.emotion
          ? language === 'ru'
            ? `${face.name}: ${localizeRuValue(face.emotion, RU_EMOTIONS)}, уверенность ${Math.ceil(face.confidence)}%`
            : `${face.name} is ${face.emotion} with ${Math.ceil(face.confidence)}% confidence`
          : ''
      )
      .filter(Boolean)
      .join(', ') || ''
  const detectedText = Array.isArray(scene.detectedText) ? scene.detectedText.join(', ') : scene.detectedText || ''

  const textParts: string[] = []

  if (language === 'ru') {
    if (scene.shotType) {
      textParts.push(`Это сцена с типом кадра ${localizeRuValue(scene.shotType, RU_SHOT_TYPES)}`)
    } else {
      textParts.push('Это сцена видео')
    }

    const faceList = scene.faces || []
    if (faces) {
      textParts.push(` с участием ${joinWithAnd(faceList, language)}`)
    }

    const facesWithDetails = scene.facesData
      ?.filter((face) => face.customMetadata && Object.keys(face.customMetadata).length > 0)
      .map((face) => {
        const attributes = Object.entries(face.customMetadata!)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ')
        return ` ${face.name} (${attributes}) `
      })

    facesWithDetails?.forEach((metadata) => textParts.push(metadata))

    if (objects) {
      textParts.push(
        objectList.length === 1
          ? `. В сцене виден объект ${objects}`
          : `. Обнаруженные объекты: ${objects}`
      )
    }

    if (scene.camera) textParts.push(`, снято на ${scene.camera}`)
    if (emotionsText) textParts.push(`. Эмоциональный анализ: ${emotionsText}`)
    if (detectedText) textParts.push(`. Текст на экране: "${detectedText}"`)
    if (scene.dominantColorName) textParts.push(`. Цветовая палитра сцены: ${scene.dominantColorName}`)
    if (scene.transcription) textParts.push(`. Транскрипция: "${scene.transcription}"`)
    if (scene.createdAt) textParts.push(`, снято в ${new Date(scene.createdAt).toISOString()}`)
    if (scene.aspectRatio) textParts.push(` в формате ${getAspectRatioDescription(scene.aspectRatio)}`)
    if (scene.description) textParts.push(`, описание: ${scene.description}`)
    if (scene.location) textParts.push(`, место съемки: ${scene.location}`)
    if (scene.source) textParts.push(`, имя папки: ${basename(dirname(scene.source))}`)
    if (scene.source) textParts.push(`, имя файла: ${basename(scene.source)}`)

    if (scene.labels && scene.labels.length > 0) {
      const labelParts = scene.labels.map((label) => {
        const [[key, value]] = Object.entries(label)
        return `${key}: ${value}`
      })
      textParts.push(`. Метки сцены: ${joinWithAnd(labelParts, language)}`)
    }
  } else {
    // Shot type description
    if (scene.shotType) {
      textParts.push(`This is ${scene.shotType} shot`)
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
        faceList?.forEach(face => textParts.push((` featuring ${face} `)))
      }
    }

    // Faces custom metadata
    const facesWithDetails = scene.facesData?.filter((face) => face.customMetadata && Object.keys(face.customMetadata).length > 0)
      .map((face) => {
        const attributes = Object.entries(face.customMetadata!)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ')
        return ` ${face.name} (${attributes}) `
      })

    facesWithDetails?.forEach(metadata => textParts.push(metadata))

    // Objects detected
    if (objects) {
      const objectList = scene.objects || []
      if (objectList.length === 1) {
        textParts.push(`. A ${objects} is visible in the scene`)
      } else if (objectList.length > 1) {
        textParts.push(`. Detected objects include ${objects}`)
      }
    }

    if (scene.camera) textParts.push(`, captured with ${scene.camera}`)
    if (emotionsText) textParts.push(`. Emotional analysis indicates that ${emotionsText}`)
    if (detectedText) textParts.push(`. On-screen text displays: "${detectedText}"`)
    if (scene.dominantColorName) textParts.push(`. The scene has a ${scene.dominantColorName} color palette`)
    if (scene.transcription) textParts.push(`. The transcription reads: "${scene.transcription}"`)
    if (scene.createdAt) textParts.push(`, captured at ${new Date(scene.createdAt).toISOString()}`)
    if (scene.aspectRatio) textParts.push(` in ${getAspectRatioDescription(scene.aspectRatio)} format`)
    if (scene.description) textParts.push(` described as ${scene.description}`)
    if (scene.location) textParts.push(` shotted at ${scene.location}`)
    if (scene.source) textParts.push(` folder name is ${basename(dirname(scene.source))}`)
    if (scene.source) textParts.push(` file name is ${basename(scene.source)}`)

    if (scene.labels && scene.labels.length > 0) {
      const labelParts = scene.labels.map((label) => {
        const [[key, value]] = Object.entries(label)
        return `${key}: ${value}`
      })

      if (labelParts.length === 1) {
        textParts.push(`. This scene is tagged as ${labelParts[0]}`)
      } else {
        textParts.push(`. This scene is tagged as ${joinWithAnd(labelParts, language)}`)
      }
    }
  }

  return textParts.join('').replace(/\s+/g, ' ').replace(/\.\./g, '.').trim()
}

export const sceneToVectorFormat = async (scene: Scene, language: AppLanguage = DEFAULT_LANGUAGE) => {
  const detectedText = Array.isArray(scene.detectedText) ? scene.detectedText.join(', ') : scene.detectedText || ''

  const text = await generateVectorDocumentText(scene, language)

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
    labels: JSON.stringify(scene.labels)
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

export const validateDocument = (doc: { id: string; text: string; metadata?: Metadata }): boolean => {
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
    const emotionsStr = metadata.emotions?.toString()

    if (emotionsStr) {
      const parsed = JSON.parse(emotionsStr)
      if (Array.isArray(parsed)) {
        emotions = parsed.map((e) => ({
          name: e.name || 'unknown',
          emotion: e.emotion || 'neutral',
          confidence: parseFloat(e.confidence) || 0,
        }))
      }
    }
  } catch {
    emotions = []
  }

  const faces = metadata.faces
    ? metadata.faces
      .toString()
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean)
    : []
  const objects = metadata.objects
    ? metadata.objects
      .toString()
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)
    : []
  const detectedText = metadata.detectedText
    ? metadata.detectedText
      .toString()
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)
    : []
  let facesData: FaceData[] = []
  try {
    facesData = metadata.facesData ? JSON.parse(metadata.facesData.toString()) : []
  } catch (e) {
    logger.warn('Failed to parse facesData: ' + e)
  }

  let objectsData: ObjectData[] = []
  try {
    objectsData = metadata.objectsData ? JSON.parse(metadata.objectsData.toString()) : []
  } catch (e) {
    logger.warn('Failed to parse objectsData: ' + e)
  }

  let detectedTextData: DetectedTextData[] = []
  try {
    detectedTextData = metadata.detectedTextData ? JSON.parse(metadata.detectedTextData.toString()) : []
  } catch (e) {
    logger.warn('Failed to parse detectedTextData: ' + e)
  }

  let transcriptionWords: TranscriptionWord[] = []
  try {
    transcriptionWords = metadata.transcriptionWords ? JSON.parse(metadata.transcriptionWords.toString()) : []
  } catch (e) {
    logger.warn('Failed to parse transcriptionWords: ' + e)
  }


  let labels: Record<string, string>[] = []
  try {
    labels = metadata.labels ? JSON.parse(metadata.labels.toString()) : []
  } catch (e) {
    logger.warn('Failed to parse labels: ' + e)
  }

  return {
    id: id,
    thumbnailUrl: metadata.thumbnailUrl?.toString() || '',
    startTime: parseFloat(metadata.startTime?.toString() || '0') || 0,
    endTime: parseFloat(metadata.endTime?.toString() || '0') || 0,
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
    labels
  }
}

export function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

export const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), timeoutMs)),
  ])
}
