import z from 'zod'
import { chatSuggestionSchema } from '../schemas/chat'

export type ChatSuggestion = z.infer<typeof chatSuggestionSchema>
