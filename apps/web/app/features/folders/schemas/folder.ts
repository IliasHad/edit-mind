import { EXCLUDED_VIDEO_PATTERNS, SUPPORTED_VIDEO_PATTERNS } from '@shared/constants/video'
import { z } from 'zod'

export const FolderCreateSchema = z.object({
  path: z.string(),
  watcherEnabled: z
    .boolean()
    .default(true),
  includePatterns: z
    .array(z.string())
    .default(SUPPORTED_VIDEO_PATTERNS),
  excludePatterns: z
    .array(z.string())
    .default(EXCLUDED_VIDEO_PATTERNS),
})

export const FolderUpdateSchema = z.object({
  watcherEnabled: z
    .boolean()
    .default(true),
  includePatterns: z
    .array(z.string())
    .default(SUPPORTED_VIDEO_PATTERNS),
  excludePatterns: z
    .array(z.string())
    .default(EXCLUDED_VIDEO_PATTERNS),
})
