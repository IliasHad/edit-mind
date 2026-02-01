import z from 'zod'
import { AspectRatio } from '.'
import { searchSuggestionSchema, VideoMetadataSummarySchema, VideoSearchParamsSchema } from '../schemas/search'

export type VideoSearchParams = z.infer<typeof VideoSearchParamsSchema>
export type SearchSuggestion = z.infer<typeof searchSuggestionSchema>

export type VideoMetadataSummary = z.infer<typeof VideoMetadataSummarySchema>

export interface FaceData {
  name: string
  count: number
  thumbnail?: string
}
export type LoadedFaces = Record<string, string[]>

export interface GenerationResult {
  message: string
  videoPath: string
  fcpxmlPath: string
}

export interface VideoConfig {
  aspectRatio: string
  fps: number
}

export interface SearchMetadata {
  aspectRatio?: AspectRatio
  faces?: string[]
}

export interface SearchAnalytics {
  query: string
  extractedParams: VideoSearchParams
  finalResultsCount: number
  durationMs: number
  timestamp: Date
}

export interface SearchStats {
  query: string
  durationMs: number
  resultsCount: number
  timestamp: Date
  performance: {
    rating: 'excellent' | 'good' | 'fair' | 'poor'
    isFast: boolean
    isAcceptable: boolean
    needsOptimization: boolean
  }
  complexity: {
    level: 'simple' | 'moderate' | 'complex'
    score: number
    factors: string[]
  }
  queryDetails: {
    hasFaces: boolean
    hasLocations: boolean
    hasEmotions: boolean
    hasObjects: boolean
    hasTranscription: boolean
    hasSemanticSearch: boolean
  }
}

export interface Suggestion {
  text: string
  type: 'face' | 'object' | 'emotion' | 'camera' | 'shotType' | 'location' | 'transcription' | 'text'
  count: number
  sceneCount: number
}

export interface GroupedSuggestions {
  [key: string]: Suggestion[]
}