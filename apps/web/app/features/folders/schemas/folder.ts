import { z } from 'zod'

export const FolderCreateSchema = z.object({
  path: z.string(),
  watcherEnabled: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  includePatterns: z.string().optional(),
  excludePatterns: z.string().optional(),
})

export const FolderUpdateSchema = z.object({
  watcherEnabled: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  includePatterns: z.string().optional(),
  excludePatterns: z.string().optional(),
})

