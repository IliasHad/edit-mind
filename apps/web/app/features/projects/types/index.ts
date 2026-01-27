import type { Project } from '@prisma/client';

export type ProjectWithVideosIds = Project & {
    videos: { id: string, name: string, source: string }[]
    _count?: {
        videos: number
    }
}
