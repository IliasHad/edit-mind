import path from 'path'
import { Analysis, DetectedObject, Face } from '@shared/types/analysis'
import { Scene } from '@shared/types/scene'
import { Transcription } from '@shared/types/transcription'
import { createHash } from 'crypto'
import { THUMBNAILS_DIR } from '@shared/constants'
import {
  generateThumbnail,
  getCameraNameAndDate,
  getLocationFromVideo,
  getVideoMetadata,
} from '@media-utils/utils/videos'
import { formatLocation, getLocationName } from '@shared/utils/location'
import { extractGPS, getGoProDeviceName, getGoProVideoMetadata } from '@media-utils/lib/gopro'
import { GoProMetadataWithStreams } from '@media-utils/types/gopro'
import { logger } from '@shared/services/logger'
import { gcd } from './shared'

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
  videoPath: string
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

  const locationName = await getLocationName(location)

  for (const frame of analysis.frame_analysis) {
    const startTime = frame.start_time_ms / 1000
    const endTime = frame.end_time_ms / 1000

    const hash = createHash('sha256').update(`${videoPath}_${startTime}_${endTime}`).digest('hex')
    const thumbnailFile = `${hash}.jpg`
    const thumbnailPath = path.join(THUMBNAILS_DIR, thumbnailFile)

    await generateThumbnail(videoPath, thumbnailPath, startTime)

    const currentScene: Scene = {
      id: hash,
      startTime,
      endTime,
      objects: frame.objects?.map((obj: DetectedObject) => obj.label) || [],
      faces: frame.faces?.map((face: Face) => face.name) || [],
      transcription: getTranscriptionForTimeRange(startTime, endTime, transcription),
      description: frame.description,
      shotType: frame.shot_type,
      emotions: frame.faces?.map((face) => ({
        name: face.name,
        emotion: face.emotion.label,
        confidence: face.emotion.confidence,
      })),
      source: videoPath,
      camera,
      createdAt: new Date(createdAt).getTime(),
      thumbnailUrl: thumbnailPath,
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
