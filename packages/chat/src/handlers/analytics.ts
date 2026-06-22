import { getScenesStream } from '@vector/services/db'
import { getVideoAnalytics } from '@shared/utils/analytics'
import { generateAnalyticsResponse } from '@ai/services/modelRouter'
import { ChatMessage } from '@prisma/client'
import { DEFAULT_LANGUAGE, type AppLanguage } from '@shared/types/language'

const analyticsFallback = (language: AppLanguage) =>
  language === 'ru'
    ? 'Извините, я не смог сгенерировать аналитический ответ.'
    : 'Sorry, I could not generate an analytics response.'

export async function handleAnalyticsIntent(
  prompt: string,
  recentMessages: ChatMessage[],
  language: AppLanguage = DEFAULT_LANGUAGE
) {
  const analytics = await getVideoAnalytics(getScenesStream)
  const response = await generateAnalyticsResponse(prompt, analytics, recentMessages, { language })

  return {
    assistantText: response.data || analyticsFallback(language),
    tokensUsed: response.tokens,
  }
}
