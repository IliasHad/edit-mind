import type { Folder, Job } from '@prisma/client'
import { z } from 'zod'
import type { FolderCreateSchema,FolderUpdateSchema } from '../schemas/folder'

export type FolderWithJobs = Folder & {
  jobs: Job[]
}

export type FolderCreateInput = z.infer<typeof FolderCreateSchema>

export type FolderUpdateInput = z.infer<typeof FolderUpdateSchema>
