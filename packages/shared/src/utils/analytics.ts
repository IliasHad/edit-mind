import { VideoAnalytics } from '@shared/types/analytics'
import { Scene } from '@shared/types/scene'
import { formatDuration } from 'date-fns'

export async function getVideoAnalytics(
  videoBatchGenerator: (batchSize?: number) => AsyncGenerator<Scene>
): Promise<VideoAnalytics> {
  let totalDuration = 0
  let totalScenes = 0
  let oldestDate: Date | null = null
  let newestDate: Date | null = null

  const uniqueSources = new Set<string>()
  const emotionCounts: Record<string, number> = {}
  const faceOccurrences: Record<string, number> = {}
  const objectsOccurrences: Record<string, number> = {}

  // Process each batch
  for await (const video of videoBatchGenerator()) {
    // Track unique sources
    uniqueSources.add(video.source)

    // Accumulate duration
    const duration = parseInt(video.duration?.toString() || '0') || 0
    totalDuration += duration

    // Track scenes
    totalScenes++

    // Track date range
    const videoDate = new Date(video.createdAt)
    if (!oldestDate || videoDate < oldestDate) {
      oldestDate = videoDate
    }
    if (!newestDate || videoDate > newestDate) {
      newestDate = videoDate
    }

    // Process emotions
    const emotions = JSON.parse(video.emotions?.toString() || '[]')
    if (Array.isArray(emotions)) {
      emotions.forEach((emotion: string) => {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1
      })
    }

    // Process faces
    const faces = JSON.parse(video.faces?.toString() || '[]')
    if (Array.isArray(faces)) {
      faces.forEach((face: string) => {
        faceOccurrences[face] = (faceOccurrences[face] || 0) + 1
      })
    }

    // Process objects
    const objects = JSON.parse(video.objects?.toString() || '[]')
    if (Array.isArray(objects)) {
      objects.forEach((obj: string) => {
        objectsOccurrences[obj] = (objectsOccurrences[obj] || 0) + 1
      })
    }
  }

  return {
    totalDuration,
    totalDurationFormatted: formatDuration({ seconds: totalDuration }),
    uniqueVideos: uniqueSources.size,
    totalScenes,
    dateRange:
      oldestDate && newestDate
        ? {
            oldest: oldestDate,
            newest: newestDate,
          }
        : null,
    emotionCounts,
    faceOccurrences,
    averageSceneDuration: totalScenes > 0 ? totalDuration / totalScenes : 0,
    objectsOccurrences,
  }
}
