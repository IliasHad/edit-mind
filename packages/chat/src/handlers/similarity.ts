import { getSimilarScenes } from '@search/services'
import { generateCompilationResponse } from '@ai/services/modelRouter'
import { ChatMessage } from '@prisma/client'

export async function handleSimilarityIntent(
  recentMessages: ChatMessage[],
  prompt: string,
  projectVideos?: string[]
) {
  const lastAssistantMessage = recentMessages.find(
    (m) => m.sender === 'assistant' && m.outputSceneIds?.length > 0
  )

  if (!lastAssistantMessage?.outputSceneIds?.[0]) {
    return {
      assistantText: "I don't have a previous scene to compare to. Could you search for a scene first?",
      outputSceneIds: [],
      tokensUsed: 0,
    }
  }

  const referenceSceneIds = lastAssistantMessage.outputSceneIds
  const results = await getSimilarScenes(referenceSceneIds, referenceSceneIds.length, projectVideos)
  const outputSceneIds = results.map((scene) => scene.id)
  
  const response = await generateCompilationResponse(prompt, outputSceneIds.length, recentMessages)
  
  return {
    assistantText: response.data || 'Sorry, I could not generate a response.',
    outputSceneIds,
    tokensUsed: response.tokens,
  }
}