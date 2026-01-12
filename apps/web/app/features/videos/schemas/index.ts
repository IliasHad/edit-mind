import { z } from 'zod'

export const videoActionSchema = z.discriminatedUnion('intent', [
  z.object({
    intent: z.literal('update-aspect-ratio'),
    newRatio: z.string(),
    source: z.string(),
  }),
  z.object({
    intent: z.literal('relink-video'),
    oldSource: z.string(),
    newSource: z.string(),
  }),
  z.object({
    intent: z.literal('delete-video'),
    source: z.string(),
  }),
    z.object({
    intent: z.literal('reindex-video'),
    source: z.string(),
  }),
])
