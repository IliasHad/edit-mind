import { getScenesStream } from '@vector/services/db'
import { getVideoAnalytics } from '@shared/utils/analytics'
import { generateAnalyticsResponse } from '@ai/services/modelRouter'
import { ChatMessage } from '@prisma/client'

export async function handleAnalyticsIntent(prompt: string, recentMessages: ChatMessage[]) {
  const analytics = await getVideoAnalytics(getScenesStream)
  const response = await generateAnalyticsResponse(prompt, analytics, recentMessages)

  return {
    assistantText: response.data || 'Sorry, I could not generate an analytics response.',
    tokensUsed: response.tokens,
  }
}
