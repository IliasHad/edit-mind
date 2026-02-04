import { z } from 'zod'

export const SearchTextSchema = z.object({
  face: z.string().optional(),
  object: z.string().optional(),
  emotion: z.string().optional(),
  shotType: z.string().optional(),
  camera: z.string().optional(),
  transcription: z.string().optional(),
  text: z.string().optional(),
  query: z.string().optional(),
  location: z.string().optional(),
})
