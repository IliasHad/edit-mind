import type { CollectionItem, Video } from "@prisma/client"
import type { Collection } from "chromadb"

export interface SearchFilters {
    face?: string[]
    object?: string[]
    emotion?: string[]
    camera?: string[]
    shotType?: string[]
    transcription?: string
    text?: string
    location?: string[]
}

export type CollectionWithItems = Collection & {
    items: (CollectionItem & {
        video: Video
    })[]
    totalDuration: string
}