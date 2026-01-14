import type { Project } from '@prisma/client';

export type ProjectWithVideosIds = Project & {
    videos: { id: string }[]
    _count?: {
        videos: number
    }
}
