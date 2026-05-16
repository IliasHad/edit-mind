import type { AppLanguage } from '@shared/types/language'

export interface VideoMetadata {
  duration: number
  fps: number
  width: number
  height: number
  totalFrames: number
  rotation?: number
  displayAspectRatio?: string
}
export interface VideoFile {
  path: string
  mtime: Date
  size: number
}

export interface CameraInfo {
  camera: string
  createdAt: string
}

export interface GeoLocation {
  latitude?: number
  longitude?: number
  altitude?: number
}

export interface FFmpegError extends Error {
  code?: number
  stderr?: string
}

export interface Dimensions {
  width: number
  height: number
}

export interface FFmpegProcessResult {
  code: number
  stderr: string
}

export interface VideoMetadataMap {
  faces: Map<string, number>
  objects: Map<string, number>
  emotions: Map<string, number>
  shotTypes: Map<string, number>
  aspectRatios: Map<string, number>
  cameras: Map<string, number>
  descriptions: string[]
  totalScenes: number
  colors: Map<string, number>
}

export interface VideoIndexJobData {
  videoPath: string
  jobId: string
  forceReIndexing?: boolean
  language?: AppLanguage
}

export interface VideoProcessingData {
  videoPath: string
  jobId: string
  forceReIndexing?: boolean
  language?: AppLanguage
  analysisPath: string
  transcriptionPath: string
  scenesPath: string
}
