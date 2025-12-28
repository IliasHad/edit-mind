import { Metadata } from 'chromadb'

export interface AddDocumentsData {
  ids: string[]
  documents: string[]
  metadata: Metadata[]
}

export interface FilterData {
  filters?: {
    faces?: string[]
    objects?: string[]
    emotions?: string[]
  }
}
export interface Filters {
  faces: string[]
  objects: string[]
  emotions: string[]
  cameras: string[]
  colors: string[]
  locations: string[]
  shotTypes: string[]
}

export interface EmbeddingInput {
  id: string
  text: string
  metadata?: Metadata
}
export interface EmbeddingVisualInput {
  id: string
  embedding: number[]
  metadata?: Metadata
}

export interface EmbeddingAudioInput {
  id: string
  embedding: number[]
  metadata?: Metadata
}

export interface CollectionStatistics {
  name: string
  totalDocuments: number
  embeddingDimension: number | null
  metadataKeys: string[]
  documentIds: string[]
}
