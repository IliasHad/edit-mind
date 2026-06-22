import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@shared/types/language'
import { z } from 'zod'

export const ChatRequestSchema = z.object({
  prompt: z.string().min(1).max(5000),
  projectId: z.string().nullable().optional(),
  language: z.enum(SUPPORTED_LANGUAGES).default(DEFAULT_LANGUAGE),
})

export const ChatStitcherRequestSchema = z.object({
  messageId: z.string().min(1),
  selectedSceneIds: z.array(z.string()).min(1),
})
