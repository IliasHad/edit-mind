import { z } from 'zod'

export const ChatRequestSchema = z.object({
    prompt: z.string().min(1).max(5000),
    projectId: z.string().nullable().optional(),
})
