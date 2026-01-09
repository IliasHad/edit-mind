import { z } from 'zod'

const videoExtensionRegex = /^\*\.(mp4|mov|avi|mkv|wmv|flv|webm|mpeg|mpg)$/i

const patternsSchema = z.string().refine(
  (patterns) => {
    if (patterns === '') return false
    return patterns.split(',').every((pattern) => videoExtensionRegex.test(pattern.trim()))
  },
  {
    message: 'All patterns must be valid video extensions (e.g., *.mp4).',
  }
)

export const folderSettingsSchema = z.object({
  watcherEnabled: z.boolean(),
  includePatterns: patternsSchema,
  excludePatterns: z.string(),
})

export const folderSettingsFormSchema = z.object({
  intent: z.literal('update-settings'),
  watcherEnabled: z.string().transform((val) => val === 'true'),
  includePatterns: z.string(),
  excludePatterns: z.string(),
})
