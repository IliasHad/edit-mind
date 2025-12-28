import * as z from 'zod'

export const VideoSearchParamsSchema = z.object({
  action: z.string().nullable().default(null),
  emotions: z.array(z.string()).default([]),
  shot_type: z.string().nullable().default(null),
  aspect_ratio: z.string().nullable().default(null),
  duration: z.number().min(0).nullable().default(null),
  description: z.string().default(''),
  objects: z.array(z.string()).default([]),
  transcriptionQuery: z.string().nullable().default(null),
  faces: z.array(z.string()).default([]),
  semanticQuery: z.string().nullable().default(null),
  locations: z.array(z.string()).default([]),
  camera: z.string().nullable().default(null),
  detectedText: z.string().nullable().default(null),
  limit: z.number().default(30),
  detectedTextRegex: z.string().nullable().default(null),
  excludeTranscriptionRegex: z.string().nullable().default(null),
  transcriptionRegex: z.string().nullable().default(null),
  searchMode: z.string().nullable().default(null),
  visualSemanticQuery: z.string().nullable().default(null),
  audioSemanticQuery: z.string().nullable().default(null),
})
