import { Analysis, DetectedObject, Face } from '@shared/types/analysis';
import { Scene } from '@shared/types/scene'
import { Transcription } from '@shared/types/transcription'
import { createHash } from 'crypto'
import { getCameraNameAndDate, getLocationFromVideo, getVideoMetadata } from '@media-utils/utils/videos'
import { formatLocation, getLocationName } from '@shared/utils/location'
import { extractGPS, getGoProDeviceName, getGoProVideoMetadata } from '@media-utils/lib/gopro'
import { GoProMetadataWithStreams } from '@media-utils/types/gopro'
import { logger } from '@shared/services/logger'
import { DEFAULT_LANGUAGE, type AppLanguage } from '@shared/types/language'
import { gcd } from './shared'

const generateSceneId = (videoPath: string, startTime: number, endTime: number) => {
  const hash = createHash('sha256').update(`${videoPath}_${startTime}_${endTime}`).digest('hex')

  return hash
}

export const generateSceneDescription = (objects: DetectedObject[], faces: Face[]): string => {
  const objectCounts: Record<string, number> = {}
  if (!Array.isArray(objects)) {
    return ''
  }
  for (const obj of objects) {
    objectCounts[obj.label] = (objectCounts[obj.label] || 0) + 1
  }

  if (faces && faces.length > 0 && objectCounts['person']) {
    delete objectCounts['person']
  }

  const descriptionParts: string[] = []

  for (const [obj, count] of Object.entries(objectCounts)) {
    if (count > 1) {
      const pluralObj = obj.endsWith('s') ? obj : `${obj}s`
      descriptionParts.push(`${count} ${pluralObj}`)
    } else {
      descriptionParts.push(`a ${obj}`)
    }
  }

  if (faces && faces.length > 0) {
    if (faces.length === 1) {
      descriptionParts.push('a person')
    } else {
      descriptionParts.push(`${faces.length} people`)
    }
  }

  if (descriptionParts.length === 0) {
    return 'No objects or people detected.'
  }

  let description: string
  if (descriptionParts.length > 1) {
    description = descriptionParts.slice(0, -1).join(', ') + ` and ${descriptionParts[descriptionParts.length - 1]}`
  } else {
    description = descriptionParts[0]
  }

  return `A scene with ${description}.`
}

type SceneDescriptionFrame = {
  description?: string
  objects?: DetectedObject[] | null
  faces?: Face[] | null
  detected_text?: Array<{ text?: string | null }> | null
  shot_type?: string | null
}

const RU_OBJECT_LABELS: Record<string, string> = {
  trailer: 'трейлер',
  door: 'дверь',
  person: 'человек',
  dog: 'собака',
  cat: 'кошка',
}

const RU_SHOT_TYPES: Record<string, string> = {
  'long-shot': 'общий план',
  'close-up': 'крупный план',
  'medium-shot': 'средний план',
}

const RU_FACE_EMOTIONS: Record<string, string> = {
  happy: 'счастливый',
  sad: 'грустный',
  neutral: 'нейтральный',
  angry: 'сердитый',
  surprised: 'удивлённый',
}

const localizeRussianLabel = (label: string, dictionary: Record<string, string>): string => {
  const normalized = label.trim().toLocaleLowerCase('en-US')
  return dictionary[normalized] ?? label
}

const formatRussianPersonCount = (count: number): string => {
  const mod10 = count % 10
  const mod100 = count % 100

  if (mod10 === 1 && mod100 !== 11) return `${count} человек`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} человека`
  return `${count} человек`
}

export const buildSceneDescription = (
  frame: SceneDescriptionFrame,
  language: AppLanguage = DEFAULT_LANGUAGE
): string => {
  if (language !== 'ru') {
    return frame.description || ''
  }

  const parts: string[] = []
  const objectLabels = (frame.objects || [])
    .map((object) => object.label?.trim())
    .filter((label): label is string => Boolean(label))
    .map((label) => localizeRussianLabel(label, RU_OBJECT_LABELS))
  const detectedText = (frame.detected_text || [])
    .map((item) => item.text?.trim())
    .filter((text): text is string => Boolean(text))
  const faceCount = frame.faces?.length || 0
  const shotType = frame.shot_type ? localizeRussianLabel(frame.shot_type, RU_SHOT_TYPES) : ''
  const faceEmotions = (frame.faces || [])
    .map((face) => face.emotion?.label?.trim())
    .filter((emotion): emotion is string => Boolean(emotion) && (faceCount === 1 || emotion.toLocaleLowerCase('en-US') !== 'neutral'))
    .map((emotion) => localizeRussianLabel(emotion, RU_FACE_EMOTIONS))

  if (objectLabels.length > 0) {
    parts.push(`Сцена с объектами: ${objectLabels.join(', ')}.`)
  }

  if (shotType) {
    parts.push(`Тип плана: ${shotType}.`)
  }

  if (faceCount > 0) {
    parts.push(`В кадре ${formatRussianPersonCount(faceCount)}.`)
  }

  if (faceEmotions.length > 0) {
    parts.push(`Эмоции: ${Array.from(new Set(faceEmotions)).join(', ')}.`)
  }

  if (detectedText.length > 0) {
    parts.push(`Текст на экране: ${detectedText.map((text) => `"${text}"`).join(', ')}.`)
  }

  if (parts.length === 0) {
    return 'Сцена без распознанных объектов или людей.'
  }

  return parts.join(' ')
}
const getTranscriptionForTimeRange = (
  startTime: number,
  endTime: number,
  transcription: Transcription | null
): string => {
  if (!transcription?.segments) return ''

  const words: string[] = []
  for (const segment of transcription.segments) {
    for (const word of segment.words) {
      if (
        (word.start >= startTime && word.start <= endTime) ||
        (word.end >= startTime && word.end <= endTime) ||
        (word.start <= startTime && word.end >= endTime)
      ) {
        words.push(word.word.trim())
      }
    }
  }

  return words.join(' ')
}

export const createScenes = async (
  analysis: Analysis,
  transcription: Transcription | null,
  videoPath: string,
  language: AppLanguage = DEFAULT_LANGUAGE
): Promise<Scene[]> => {
  const scenes: Scene[] = []

  const metadata = await getVideoMetadata(videoPath)

  const duration = metadata.duration
  const { latitude, longitude, altitude } = await getLocationFromVideo(videoPath)
  let location = formatLocation(latitude, longitude, altitude)

  const { camera, createdAt } = await getCameraNameAndDate(videoPath)
  const aspectRatio =
    metadata?.displayAspectRatio ||
    (metadata?.width && metadata?.height
      ? (() => {
        const divisor = gcd(metadata.width, metadata.height)
        return `${metadata.width / divisor}:${metadata.height / divisor}`
      })()
      : 'Unknown')

  let initialCamera = camera
  if (initialCamera.toLocaleLowerCase().includes('gopro')) {
    const goproTelemetry = await getGoProVideoMetadata(videoPath)
    if (goproTelemetry) {
      initialCamera = getGoProDeviceName(goproTelemetry)

      const streamData = goproTelemetry['1']
      const gpsCoordinates = extractGPS(streamData as GoProMetadataWithStreams)
      if (gpsCoordinates.length > 0) {
        location = formatLocation(gpsCoordinates[0]?.lat, gpsCoordinates[0]?.lon, gpsCoordinates[0]?.alt)
      } else {
        logger.warn(`No GPS data found in GoPro video: ${videoPath}`)
      }
    }
  }

  const locationName = await getLocationName(location, language)


  for (const frame of analysis.frame_analysis) {
    const startTime = frame.start_time_ms / 1000
    const endTime = frame.end_time_ms / 1000
    const id = generateSceneId(videoPath, startTime, endTime)
    const currentScene: Scene = {
      id,
      startTime,
      endTime,
      objects: frame.objects?.map((obj: DetectedObject) => obj.label) || [],
      faces: frame.faces?.map((face: Face) => face.name) || [],
      transcription: getTranscriptionForTimeRange(startTime, endTime, transcription),
      description: buildSceneDescription(frame, language),
      shotType: frame.shot_type,
      emotions: frame.faces?.map((face) => ({
        name: face.name,
        emotion: face.emotion.label,
        confidence: face.emotion.confidence,
      })),
      source: videoPath,
      camera: initialCamera,
      createdAt: new Date(createdAt).getTime(),
      thumbnailUrl: frame.thumbnail_path,
      dominantColorHex: frame.dominant_color?.hex || '',
      dominantColorName: frame.dominant_color?.name || '',
      detectedText: frame.detected_text?.map((item) => item.text) || [],
      location: locationName,
      duration,
      facesData: frame.faces?.map((face) => ({
        name: face?.name,
        bbox: face?.bbox,
        confidence: face?.confidence,
        emotion: {
          label: face.emotion.label,
          confidence: face.emotion.confidence,
        },
        customMetadata: face.custom_metadata
      })),
      transcriptionWords: transcription?.segments
        .filter((segment) => segment.end >= startTime && segment.start <= endTime)

        .flatMap((segment) =>
          segment.words
            .filter((word) => word.start >= startTime && word.end <= endTime)
            .map((word) => ({
              start: word.start,
              end: word.end,
              word: word.word,
              confidence: word.confidence,
            }))
        ),
      objectsData: frame.objects?.map((object) => ({
        label: object.label,
        bbox: object.bbox,
        confidence: object.confidence,
      })),
      detectedTextData: frame.detected_text?.map((text) => ({
        text: text.text,
        bbox: text.bbox,
        confidence: text.confidence,
      })),
      aspectRatio: aspectRatio,
    }

    scenes.push(currentScene)
  }

  return scenes
}
