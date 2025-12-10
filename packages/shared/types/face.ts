import z from 'zod'
import { unknownFace } from '../schemas'

export type UnknownFace = z.infer<typeof unknownFace>

export interface FaceIndexingProgress {
  progress: number
  elapsed: string
}
export interface KnownFace {
  name: string
  image: string
}

export type FaceIndexProgress = {
  progress: number
  elapsed: string
}

export interface FaceLabelingJobData {
  personName: string
  referenceImages: string[]
  unknownFacesDir: string
}

export interface MatchResult {
  json_file: string
  image_file: string
  confidence: number
  face_id: string
  face_data: {
    video_path: string
    timestamp_seconds: number
  }
}

export interface FaceMatchingProgress {
  current: number
  total: number
  progress: number
  elapsed: number
  match?: MatchResult
}


export interface FindMatchingFacesResponse {
  success: boolean
  person_name: string
  matches_found: number
  matches: MatchResult[]
  reference_images_used: number
}