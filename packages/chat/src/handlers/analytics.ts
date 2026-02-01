import { getVideoAnalytics } from '@shared/utils/analytics'
import { getAllVideos } from '@vector/services/db'
import { generateAnalyticsResponse } from '@ai/services/modelRouter'
import { ChatMessage } from '@prisma/client'

export async function handleAnalyticsIntent(prompt: string, recentMessages: ChatMessage[]) {
  const videosWithScenes = await getAllVideos()
  const analytics = await getVideoAnalytics(videosWithScenes)
  const response = await generateAnalyticsResponse(prompt, analytics, recentMessages)
  
  return {
    assistantText: response.data || 'Sorry, I could not generate an analytics response.',
    tokensUsed: response.tokens,
  }
}