import { z } from 'zod'

export const FolderCreateSchema = z.object({
  path: z.string(),
  watcherEnabled: z
    .string()
    .transform((val) => val === 'true')
    .default(true),
  includePatterns: z
    .string()
    .transform((val) => val.split(','))
    .default(['*.mp4', '*.mov', '*.avi', '*.mkv']),
  excludePatterns: z
    .string()
    .transform((val) => val.split(','))
    .default(['*.part', '*.temp']),
})

export const FolderUpdateSchema = z.object({
  watcherEnabled: z
    .string()
    .transform((val) => val === 'true')
    .default(true),
  includePatterns: z
    .string()
    .transform((val) => val.split(','))
    .default(['*.mp4', '*.mov', '*.avi', '*.mkv']),
  excludePatterns: z
    .string()
    .transform((val) => val.split(','))
    .default(['*.part', '*.temp']),
})
