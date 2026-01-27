import type { CollectionType, Video } from '@prisma/client'

export type VideoWithCollectionsAndProjects = Video & { collectionItems: CollectionItemsWithNameAndId[] } & {
  projects: ProjectWithIdAndName[]
}

export type ProjectWithIdAndName = { name: string; id: string }

export type CollectionItemsWithNameAndId = {
  collection: { name: string; id: string; type: CollectionType }
  confidence: number
}

export interface VideoWithFolderPath extends Video {
  folder: {
    path: string
  }
}

export type SortOption = 'shottedAt' | 'importAt' | 'updatedAt' | 'duration'
export type SortOrder = 'asc' | 'desc'
export type SortOptions = { value: SortOption; label: string }
