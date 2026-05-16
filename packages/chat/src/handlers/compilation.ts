import { searchScenes } from '@search/services'
import { generateActionFromPrompt, generateCompilationResponse } from '@ai/services/modelRouter'
import { ChatMessageModel } from '@db/index'
import { ChatMessage } from '@prisma/client'
import { DEFAULT_LANGUAGE, type AppLanguage } from '@shared/types/language'

const compilationFallback = (key: 'understand' | 'response', language: AppLanguage) => {
  const messages = {
    understand: {
      en: 'Sorry, I could not understand your request.',
      ru: 'Извините, я не смог понять ваш запрос.',
    },
    response: {
      en: 'Sorry, I could not generate a compilation response.',
      ru: 'Извините, я не смог сгенерировать ответ для подборки.',
    },
  } as const

  return messages[key][language]
}

export async function handleCompilationIntent(
  prompt: string,
  recentMessages: ChatMessage[],
  newMessage: ChatMessage,
  projectVideos?: string[],
  language: AppLanguage = DEFAULT_LANGUAGE
) {
  const { data: searchParams, tokens, error } = await generateActionFromPrompt(prompt, recentMessages, { language })
  
  if (error || !searchParams) {
    return {
      assistantText: compilationFallback('understand', language),
      outputSceneIds: [],
      tokensUsed: tokens,
    }
  }

  await ChatMessageModel.update(newMessage.id, { stage: 'searching' })

  const results = await searchScenes(searchParams, searchParams.limit, true, projectVideos)
  const outputSceneIds = results.flatMap((result) => result.scenes).map((scene) => scene.id)
  
  const response = await generateCompilationResponse(prompt, outputSceneIds.length, recentMessages, { language })
  
  return {
    assistantText: response.data || compilationFallback('response', language),
    outputSceneIds,
    tokensUsed: tokens + response.tokens,
  }
}