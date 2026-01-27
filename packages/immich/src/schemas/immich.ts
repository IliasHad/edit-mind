import { z } from 'zod'

export const ImmichConfigFormSchema = z.object({
  apiKey: z
    .string()
    .min(1, 'API key is required'),
  baseUrl: z
    .string()
    .regex(/^https?:\/\//, 'URL must start with http:// or https://')
})

export const ImmichActionSchema = z.discriminatedUnion('intent', [
  z.object({
    intent: z.literal('start-import'),
    apiKey: z.string().min(1),
    baseUrl: z.string().optional(),
  }),
  z.object({
    intent: z.literal('delete-integration'),
  }),
  z.object({
    intent: z.literal('refresh-import'),
  }),
])
