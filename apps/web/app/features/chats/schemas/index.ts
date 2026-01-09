import { z } from 'zod'

export const ChatCreateSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  projectId: z.string().nullable().default(null),
})

export const ChatMessageCreateSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
})

export const ChatMessageStitcherSchema = z.object({
  selectedSceneIds: z.array(z.string()).min(1, 'At least one scene id is require').default([]),
})

export const ChatMessageExportSchema = z.object({
  selectedSceneIds: z.array(z.string()).min(1, 'At least one scene id is require').default([]),
})
