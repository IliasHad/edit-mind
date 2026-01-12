import type { Project, Video } from '@prisma/client'

export type ProjectWithVideosIds = Project & {
    videosIds: { id: string }[]
    _count?: {
        videos: number
    }
}

export interface VideoWithFolderPath extends Video {
    folder: {
        path: string
    }
}
