import path from 'path'
import { Analysis, DetectedObject, Face } from '../types/analysis'
import { Scene } from '../types/scene'
import { Transcription } from '../types/transcription'

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
export const createScenes = async (
  analysis: Analysis,
  transcription: Transcription | null,
  videoPath: string
): Promise<Scene[]> => {
  const scenes: Scene[] = []

  const getTranscriptionForTimeRange = (startTime: number, endTime: number): string => {
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

  for (const frame of analysis.frame_analysis) {
    const startTime = frame.start_time_ms / 1000
    const endTime = frame.end_time_ms / 1000

    const currentScene: Scene = {
      id: 'scene_' + (scenes.length + 1) + '_' + path.basename(videoPath),
      startTime,
      endTime,
      objects: frame.objects?.map((obj: DetectedObject) => obj.label) || [],
      faces: frame.faces?.map((face: Face) => face.name) || [],
      transcription: getTranscriptionForTimeRange(startTime, endTime),
      description: generateSceneDescription(frame.objects, frame.faces),
      shot_type: frame.shot_type,
      emotions: frame.faces?.map((face) => ({ name: face.name, emotion: face.emotion.label })),
      source: videoPath,
      camera: '',
      createdAt: 0,
      dominantColorHex: frame.dominant_color?.hex || '',
      dominantColorName: frame.dominant_color?.name || '',
      detectedText: frame.detected_text?.map((item) => item.text) || [],
      location: '',
      duration: 0,
      facesData: frame.faces?.map((face) => ({
        name: face?.name,
        bbox: face?.bbox,
        confidence: face?.confidence,
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
      aspect_ratio: '16:9',
    }

    scenes.push(currentScene)
  }

  return scenes
}
