import z from 'zod'
import { searchSuggestionSchema, VideoMetadataSummarySchema } from '../conveyor/schemas/app-schema'

export interface VideoSearchParams {
  action: string | null
  emotions: string[]
  shot_type?: string | null
  aspect_ratio: string | null
  duration: number | null
  description: string
  outputFilename: string
  objects: string[]
  camera?: string
  transcriptionQuery: string | null
  detectedText?: string
}

export type SearchQuery = {
  action: string | null
  emotions: string[]
  shot_type?: string | null
  aspect_ratio: string | null
  description: string
  objects: string[]
  camera?: string
  transcriptionQuery: string | null
  detectedText?: string
  faces?: string[]
}

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
  aspectRatio?: string
  faces?: string[]
}
