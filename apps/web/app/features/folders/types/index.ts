import type { Folder, Job } from '@prisma/client'

export type FolderWithJobs = Folder & {
    jobs: Job[]
}

export interface FolderCreateInput {
    path: string
    watcherEnabled?: boolean
    includePatterns?: string[]
    excludePatterns?: string[]
}

export interface FolderUpdateInput {
    watcherEnabled?: boolean
    includePatterns?: string[]
    excludePatterns?: string[]
}
