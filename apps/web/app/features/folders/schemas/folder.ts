import { z } from 'zod'

export const FolderCreateSchema = z.object({
  path: z.string(),
  watcherEnabled: z
    .boolean()
    .default(true),
  includePatterns: z
    .array(z.string())
    .default(['*.mp4', '*.mov', '*.avi', '*.mkv']),
  excludePatterns: z
    .array(z.string())
    .default(['*.part', '*.temp']),
})

export const FolderUpdateSchema = z.object({
  watcherEnabled: z
    .boolean()
    .default(true),
  includePatterns: z
    .array(z.string())
    .default(['*.mp4', '*.mov', '*.avi', '*.mkv']),
  excludePatterns: z
    .array(z.string())
    .default(['*.part', '*.temp']),
})
