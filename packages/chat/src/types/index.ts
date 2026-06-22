import { ChatMessage } from "@prisma/client"
import { IntentData } from "@shared/types/chat"
import type { AppLanguage } from '@shared/types/language'

export interface ProcessIntentInput {
  intent: IntentData
  prompt: string
  recentMessages: ChatMessage[]
  newMessage: ChatMessage
  projectVideos?: string[]
  language?: AppLanguage
}

export interface ProcessIntentResult {
  assistantText: string
  outputSceneIds: string[]
  tokensUsed: number
}

