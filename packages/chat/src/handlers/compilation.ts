import { searchScenes } from '@search/services'
import { generateActionFromPrompt, generateCompilationResponse } from '@ai/services/modelRouter'
import { ChatMessageModel } from '@db/index'
import { ChatMessage } from '@prisma/client'

export async function handleCompilationIntent(
  prompt: string,
  recentMessages: ChatMessage[],
  newMessage: ChatMessage,
  projectVideos?: string[]
) {
  const { data: searchParams, tokens, error } = await generateActionFromPrompt(prompt, recentMessages)
  
  if (error || !searchParams) {
    return {
      assistantText: 'Sorry, I could not understand your request.',
      outputSceneIds: [],
      tokensUsed: tokens,
    }
  }

  await ChatMessageModel.update(newMessage.id, { stage: 'searching' })

  const results = await searchScenes(searchParams, searchParams.limit, true, projectVideos)
  const outputSceneIds = results.flatMap((result) => result.scenes).map((scene) => scene.id)
  
  const response = await generateCompilationResponse(prompt, outputSceneIds.length, recentMessages)
  
  return {
    assistantText: response.data || 'Sorry, I could not generate a compilation response.',
    outputSceneIds,
    tokensUsed: tokens + response.tokens,
  }
}