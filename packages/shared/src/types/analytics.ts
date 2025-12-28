export type VideoAnalytics = {
  totalDuration: number
  totalDurationFormatted: string

  uniqueVideos: number
  totalScenes: number

  dateRange: {
    oldest: Date
    newest: Date
  } | null

  emotionCounts: Record<string, number>
  faceOccurrences: Record<string, number>
  objectsOccurrences: Record<string, number>

  averageSceneDuration: number
}
