import { z } from 'zod'

export const chatSuggestionSchema = z.object({
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