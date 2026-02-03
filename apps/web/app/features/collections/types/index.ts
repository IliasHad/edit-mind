import type { CollectionItem, Video, Collection } from '@prisma/client'


export type CollectionWithItems = Collection & {
  items: (CollectionItem & {
    video: Video
  })[]
  totalDuration: string
}

export type CollectionItemWithVideo = CollectionItem & {
  video: Video
}