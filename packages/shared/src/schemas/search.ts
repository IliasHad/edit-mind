import * as z from 'zod'

export const VideoSearchParamsSchema = z.object({
  action: z.string().nullable().default(null),
  emotions: z.array(z.string()).default([]),
  shotType: z.string().nullable().default(null),
  aspectRatio: z.string().nullable().default(null),
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
  searchMode: z.string().nullable().default("all"),
})

export const searchSuggestionSchema = z.object({
  text: z.string(),
  icon: z.string(),
  border: z.string(),
  category: z.union([
    z.literal('people'),
    z.literal('emotion'),
    z.literal('scene'),
    z.literal('action'),
    z.literal('color'),
  ]),
})

const NameCountSchema = z.object({
  name: z.string(),
  count: z.number(),
})

export const VideoMetadataSummarySchema = z.object({
  topFaces: z.array(NameCountSchema),
  topObjects: z.array(NameCountSchema),
  topEmotions: z.array(NameCountSchema),
  shotTypes: z.array(NameCountSchema),
  cameras: z.array(NameCountSchema),
  topColors: z.array(NameCountSchema),
  topLocations: z.array(NameCountSchema),
  totalVideos: z.number()
})
