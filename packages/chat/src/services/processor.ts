import { generateGeneralResponse } from '@ai/services/modelRouter'
import { logger } from '@shared/services/logger'
import {
  handleAnalyticsIntent,
  handleCompilationIntent,
  handleRefinementIntent,
  handleSimilarityIntent,
} from '@chat/handlers'
import { ProcessIntentInput, ProcessIntentResult } from '@chat/types'
import { DEFAULT_LANGUAGE, type AppLanguage } from '@shared/types/language'


const fallbackText = (key: 'general', language: AppLanguage) => {
  const messages = {
    general: {
      en: 'Sorry, I could not generate a response.',
      ru: 'Извините, я не смог сгенерировать ответ.',
    },
  } as const

  return messages[key][language]
}

export async function processIntent(input: ProcessIntentInput): Promise<ProcessIntentResult> {
  const { intent, prompt, recentMessages, newMessage, projectVideos, language = DEFAULT_LANGUAGE } = input
  const aiOptions = { language }
  let assistantText: string
  let outputSceneIds: string[] = []
  let tokensUsed = 0

  switch (intent.type) {
    case 'similarity': {
      const result = await handleSimilarityIntent(recentMessages, prompt, projectVideos, language)
      assistantText = result.assistantText
      outputSceneIds = result.outputSceneIds
      tokensUsed = result.tokensUsed
      break
    }

    case 'analytics': {
      const result = await handleAnalyticsIntent(prompt, recentMessages, language)
      assistantText = result.assistantText
      tokensUsed = result.tokensUsed
      break
    }

    case 'refinement': {
      const result = await handleRefinementIntent(prompt, recentMessages, newMessage, intent, projectVideos, language)
      assistantText = result.assistantText
      outputSceneIds = result.outputSceneIds
      tokensUsed = result.tokensUsed
      break
    }

    case 'compilation': {
      const result = await handleCompilationIntent(prompt, recentMessages, newMessage, projectVideos, language)
      assistantText = result.assistantText
      outputSceneIds = result.outputSceneIds
      tokensUsed = result.tokensUsed
      break
    }

    case 'general':
    default: {
      const response = await generateGeneralResponse(prompt, recentMessages, aiOptions)
      if (!response.data) {
        logger.warn(
          {
            intentType: intent.type,
            responseError: response.error,
            tokens: response.tokens,
            promptLength: prompt.length,
            recentMessagesCount: recentMessages.length,
          },
          'Using generic chat fallback because model returned no data'
        )
      }
      assistantText = response.data || fallbackText('general', language)
      tokensUsed = response.tokens
      break
    }
  }

  return { assistantText, outputSceneIds, tokensUsed }
}
