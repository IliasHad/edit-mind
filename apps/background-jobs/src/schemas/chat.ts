import { z } from 'zod'

export const ChatRequestSchema = z.object({
  prompt: z.string().min(1).max(5000),
  projectId: z.string().nullable().optional(),
})

export const ChatStitcherRequestSchema = z.object({
  messageId: z.string().min(1),
  selectedSceneIds: z.array(z.string()).min(1),
})
