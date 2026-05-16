import { searchScenes } from '@search/services'
import { generateActionFromPrompt, generateCompilationResponse } from '@ai/services/modelRouter'
import { ChatMessageModel } from '@db/index'
import { ChatMessage } from '@prisma/client'
import { IntentData } from '@shared/types/chat'
import { DEFAULT_LANGUAGE, type AppLanguage } from '@shared/types/language'

const refinementFallback = (key: 'understand' | 'response', language: AppLanguage) => {
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

export async function handleRefinementIntent(
  prompt: string,
  recentMessages: ChatMessage[],
  newMessage: ChatMessage,
  intent: IntentData,
  projectVideos?: string[],
  language: AppLanguage = DEFAULT_LANGUAGE
) {
  const { data: searchParams, tokens, error } = await generateActionFromPrompt(prompt, recentMessages, { language })
  
  if (error || !searchParams) {
    return {
      assistantText: refinementFallback('understand', language),
      outputSceneIds: [],
      tokensUsed: tokens,
    }
  }

  await ChatMessageModel.update(newMessage.id, { stage: 'searching' })
  const results = await searchScenes(searchParams, searchParams.limit, true, projectVideos)

  await ChatMessageModel.update(newMessage.id, { stage: 'refining' })

  let outputSceneIds: string[]

  if (intent.keepPrevious) {
    const lastAssistantMessage = recentMessages.find(
      (m) => m.sender === 'assistant' && m.outputSceneIds?.length > 0
    )
    
    if (lastAssistantMessage?.outputSceneIds) {
      const newSceneIds = results.flatMap((result) => result.scenes).map((scene) => scene.id)
      const previousSceneIds = lastAssistantMessage.outputSceneIds.filter(Boolean)
      outputSceneIds = [...newSceneIds, ...previousSceneIds.filter((id) => !newSceneIds.includes(id))]
    } else {
      outputSceneIds = results.flatMap((result) => result.scenes).map((scene) => scene.id)
    }
  } else {
    outputSceneIds = results.flatMap((result) => result.scenes).map((scene) => scene.id)
  }

  const response = await generateCompilationResponse(prompt, outputSceneIds.length, recentMessages, { language })
  
  return {
    assistantText: response.data || refinementFallback('response', language),
    outputSceneIds,
    tokensUsed: tokens + response.tokens,
  }
}