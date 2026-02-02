import { ChatMessage } from "@prisma/client"
import { IntentData } from "@shared/types/chat"

export interface ProcessIntentInput {
  intent: IntentData
  prompt: string
  recentMessages: ChatMessage[]
  newMessage: ChatMessage
  projectVideos?: string[]
}

export interface ProcessIntentResult {
  assistantText: string
  outputSceneIds: string[]
  tokensUsed: number
}

