interface Metadata {
  [key: string]: string | number | boolean | undefined
}

export interface AddDocumentsData {
  ids: string[]
  documents: string[]
  metadatas: Metadata[]
}

export interface FilterData {
  filters?: {
    faces?: string[]
    objects?: string[]
    emotions?: string[]
  }
}

export interface EmbeddingInput {
  id: string
  text: string
  metadata?: Record<string, string | number | null>
}

export interface CollectionStatistics {
  name: string
  totalDocuments: number
  embeddingDimension: number | null
  metadataKeys: string[]
  documentIds: string[]
}
