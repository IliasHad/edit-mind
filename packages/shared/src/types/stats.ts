export interface YearStats {
  totalVideos: number
  totalScenes: number
  totalDuration: number
  topEmotions: Array<{ emotion: string; count: number }>
  topObjects: Array<{ name: string; count: number }>
  topFaces: Array<{ name: string; count: number }>
  topShotTypes: Array<{ name: string; count: number }>
  topWords: Array<{ word: string; count: number }>
  categories: Array<{ name: string; count: number }>
  longestScene: { duration: number; description: string; videoSource: string }
  shortestScene: { duration: number; description: string; videoSource: string } | null
}
