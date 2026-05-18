export interface Scene {
  id: string
  source: string
  startTime: number
  endTime: number
  duration: number
  description: string
  transcription: string
  shotType: string
  camera: string
  location: string
  faces: string[]
  objects: string[]
  emotions: Array<{ name: string; emotion: string; confidence: number }>
  detectedText: string[]
  thumbnailUrl: string | null
  dominantColorName: string | null
  matched: boolean
}

export interface Video {
  id: string
  name: string
  source: string
  thumbnailUrl: string | null
  duration: number
  location: string | null
  aspectRatio: string | null
  importAt: string
}

export interface Collection {
  id: string
  name: string
  type: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface CollectionItem {
  id: string
  collectionId: string
  videoId: string
  video?: Video
}

export type Fetcher = (path: string, options?: RequestInit) => Promise<Response>
