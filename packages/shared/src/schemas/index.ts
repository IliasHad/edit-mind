import { z } from 'zod'

export const emotionSchema = z.object({
  name: z.string(),
  emotion: z.string(),
  confidence: z.number(),
})

export const boundingBoxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
})

export const faceSchema = z.object({
  name: z.string(),
  bbox: boundingBoxSchema.optional(),
  confidence: z.number().optional(),
  emotion: {
    label: z.string().optional(),
    confidence: z.number().optional(),
  },
})

export const objectDataSchema = z.object({
  label: z.string(),
  bbox: boundingBoxSchema.optional(),
  confidence: z.number().optional(),
})

export const detectedTextDataSchema = z.object({
  text: z.string(),
  bbox: boundingBoxSchema.optional(),
  confidence: z.number().optional(),
})

export const transcriptionWordSchema = z.object({
  word: z.string(),
  start: z.number(),
  end: z.number(),
  confidence: z.number().optional(),
})

export const sceneSchema = z.object({
  id: z.string(),
  source: z.string(),
  thumbnailUrl: z.string().optional(),
  startTime: z.number(),
  endTime: z.number(),
  duration: z.number().optional(),
  faces: z.array(z.string()),
  objects: z.array(z.string()),
  detectedText: z.array(z.string()),
  facesData: z.array(faceSchema).optional(),
  objectsData: z.array(objectDataSchema).optional(),
  detectedTextData: z.array(detectedTextDataSchema).optional(),
  transcription: z.string(),
  transcriptionWords: z.array(transcriptionWordSchema).optional(),
  description: z.string(),
  shotType: z.string(),
  emotions: z.array(emotionSchema),
  dominantColorHex: z.string().optional(),
  dominantColorName: z.string().optional(),
  camera: z.string(),
  createdAt: z.number(),
  location: z.string(),
  category: z.string().optional(),
  aspectRatio: z.string(),
  text: z.string().optional(),
})

export type Scene = z.infer<typeof sceneSchema>

export const chromaMetadataSchema = z.object({
  source: z.string(),
  thumbnailUrl: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  duration: z.number(),
  faces: z.string(),
  objects: z.string(),
  transcription: z.string(),
  description: z.string(),
  shotType: z.string(),
  detectedText: z.string(),
  facesData: z.string(),
  objectsData: z.string(),
  detectedTextData: z.string(),
  transcriptionWords: z.string(),
  emotions: z.string(),
  createdAt: z.string(),
  location: z.string(),
  dominantColorHex: z.string(),
  dominantColorName: z.string(),
  camera: z.string(),
  aspectRatio: z.string(),
  category: z.string(),
  text: z.string().optional(),
})

export type ChromaMetadata = z.infer<typeof chromaMetadataSchema>

export const videoSchema = z.object({
  fileName: z.string().optional(),
  source: z.string(),
  duration: z.number(),
  aspectRatio: z.string(),
  camera: z.string(),
  category: z.string(),
  createdAt: z.number(),
  scenes: z.array(sceneSchema).optional(),
  sceneCount: z.number().optional(),
  thumbnailUrl: z.string().optional(),
  dominantColorHex: z.string().optional(),
  dominantColorName: z.string().optional(),
  faces: z.array(z.string()),
  objects: z.array(z.string()),
  emotions: z.array(z.string()),
  shotTypes: z.array(z.string()),
  location: z.string().optional(),
})

export const searchSuggestionSchema = z.object({
  text: z.string(),
  icon: z.string(),
  border: z.string(),
  category: z.union([z.literal('people'), z.literal('emotion'), z.literal('color'), z.literal('object')]),
})

export const exportedSceneSchema = z.object({
  startTime: z.number(),
  endTime: z.number(),
  source: z.string(),
})
