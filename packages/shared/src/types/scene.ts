import z from 'zod'
import {
  boundingBoxSchema,
  detectedTextDataSchema,
  exportedSceneSchema,
  faceSchema,
  objectDataSchema,
  sceneSchema,
  transcriptionWordSchema,
  emotionSchema,
} from '../schemas'

export type Scene = z.infer<typeof sceneSchema>

export type ExportedScene = z.infer<typeof exportedSceneSchema>

export type DetectedTextData = z.infer<typeof detectedTextDataSchema>
export type BoundingBox = z.infer<typeof boundingBoxSchema>
export type FaceData = z.infer<typeof faceSchema>
export type TranscriptionWord = z.infer<typeof transcriptionWordSchema>
export type Emotion = z.infer<typeof emotionSchema>

export type ObjectData = z.infer<typeof objectDataSchema>
