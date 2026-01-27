import z from 'zod'
import { ImmichConfigFormSchema } from '../schemas/immich'

export interface ImmichImporterJobData {
  integrationId: string
}

export type ImmichConfig = z.infer<typeof ImmichConfigFormSchema>

export interface Person {
  id: string
  name: string
}

export interface PeopleResponse {
  people: Person[]
  hasNextPage: boolean
}

export interface TimeBucket {
  timeBucket: string
  count: number
}

export interface AssetsBucketResponse {
  id: string[]
}

export interface Face {
  id: string
  person: {
    id: string
  }
  boundingBoxX1: number
  boundingBoxY1: number
  boundingBoxX2: number
  boundingBoxY2: number
  imageHeight: number
  imageWidth: number
  sourceType: 'machine-learning' | 'exif' | 'manual'
}

export interface ApiTestResponse {
  name: string
  id: string
  createdAt: Date
  updatedAt: Date
  permissions: string[]
}

export interface ImmichImportStatus {
  isImporting: boolean
  progress: number
  processedFaces: number
  status: 'idle' | 'importing' | 'completed' | 'failed'
  error: string | null
}
export interface ImmichImportJobProgress {
  progress: number
  processedFaces: number
}
export interface ImmichIntegration {
  id: string
  userId: string
  apiKey: string
  baseUrl: string
  createdAt: Date
  updatedAt: Date
}
export interface ImmichAsset {
  originalMimeType: string
  originalFileName: string
  people: {
    id: string
    name: string
    faces: Face[]
  }[]
}
