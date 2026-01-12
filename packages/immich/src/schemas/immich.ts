import { z } from 'zod'

export const ImmichConfigFormSchema = z.object({
  apiKey: z
    .string()
    .min(1, 'API key is required')
    .min(20, 'API key must be at least 20 characters')
    .max(500, 'API key is too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'API key contains invalid characters'),
  baseUrl: z
    .string()
    .regex(/^https?:\/\//, 'URL must start with http:// or https://')
    .optional()
    .default('http://host.docker.internal:2283'),
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
