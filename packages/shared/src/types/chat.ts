import z from 'zod'
import { chatSuggestionSchema } from '../schemas/chat'

export type ChatSuggestion = z.infer<typeof chatSuggestionSchema>

export type IntentType = 'similarity' | 'analytics' | 'refinement' | 'compilation' | 'general'
export interface IntentData {
  type?: IntentType
  needsVideoData?: boolean
  keepPrevious?: boolean
}
