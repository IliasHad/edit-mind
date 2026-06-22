import { getSimilarScenes } from '@search/services/similarity'
import { generateCompilationResponse } from '@ai/services/modelRouter'
import { ChatMessage } from '@prisma/client'
import { DEFAULT_LANGUAGE, type AppLanguage } from '@shared/types/language'

const similarityFallback = (key: 'missingReference' | 'response', language: AppLanguage) => {
  const messages = {
    missingReference: {
      en: "I don't have a previous scene to compare to. Could you search for a scene first?",
      ru: 'У меня нет предыдущей сцены для сравнения. Сначала найдите сцену, пожалуйста.',
    },
    response: {
      en: 'Sorry, I could not generate a response.',
      ru: 'Извините, я не смог сгенерировать ответ.',
    },
  } as const

  return messages[key][language]
}

export async function handleSimilarityIntent(
  recentMessages: ChatMessage[],
  prompt: string,
  projectVideos?: string[],
  language: AppLanguage = DEFAULT_LANGUAGE
) {
  const lastAssistantMessage = recentMessages.find(
    (m) => m.sender === 'assistant' && m.outputSceneIds?.length > 0
  )

  if (!lastAssistantMessage?.outputSceneIds?.[0]) {
    return {
      assistantText: similarityFallback('missingReference', language),
      outputSceneIds: [],
      tokensUsed: 0,
    }
  }

  const referenceSceneIds = lastAssistantMessage.outputSceneIds
  const results = await getSimilarScenes(referenceSceneIds, referenceSceneIds.length, projectVideos)
  const outputSceneIds = results.map((scene) => scene.id)
  
  const response = await generateCompilationResponse(prompt, outputSceneIds.length, recentMessages, { language })
  
  return {
    assistantText: response.data || similarityFallback('response', language),
    outputSceneIds,
    tokensUsed: response.tokens,
  }
}