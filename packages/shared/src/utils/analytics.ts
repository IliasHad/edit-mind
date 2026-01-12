import { VideoWithScenes } from '@shared/types/video'
import { formatDuration } from 'date-fns'

export async function getVideoAnalytics(videosWithScenes: VideoWithScenes[]) {

  const totalDuration = videosWithScenes.reduce((sum, video) => {
    return sum + (parseInt(video.duration.toString()) || 0)
  }, 0)

  const uniqueVideos = new Set(videosWithScenes.map((v) => v.source)).size
  const totalScenes = videosWithScenes.length

  const dates = videosWithScenes.map((v) => new Date(v.createdAt)).sort((a, b) => a.getTime() - b.getTime())
  const oldestDate = dates[0]
  const newestDate = dates[dates.length - 1]

  const emotionCounts = videosWithScenes.reduce(
    (acc, scene) => {
      JSON.parse(scene.emotions?.toString() || '[]')?.forEach((emotion: string) => {
        acc[emotion] = (acc[emotion] || 0) + 1
      })
      return acc
    },
    {} as Record<string, number>
  )

  const objectsOccurrences = videosWithScenes.reduce(
    (acc, scene) => {
      JSON.parse(scene.objects?.toString() || '[]')?.forEach((object: string) => {
        acc[object] = (acc[object] || 0) + 1
      })
      return acc
    },
    {} as Record<string, number>
  )

  const faceOccurrences = videosWithScenes.reduce(
    (acc, scene) => {
      JSON.parse(scene.faces?.toString() || '[]')?.forEach((face: string) => {
        acc[face] = (acc[face] || 0) + 1
      })
      return acc
    },
    {} as Record<string, number>
  )

  return {
    totalDuration,
    totalDurationFormatted: formatDuration({ seconds: totalDuration }),
    uniqueVideos,
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
