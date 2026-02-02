import { generateGeneralResponse } from '@ai/services/modelRouter';
import {
  handleAnalyticsIntent,
  handleCompilationIntent,
  handleRefinementIntent,
  handleSimilarityIntent,
} from '@chat/handlers'
import { ProcessIntentInput, ProcessIntentResult } from '@chat/types'


export async function processIntent(input: ProcessIntentInput): Promise<ProcessIntentResult> {
  const { intent, prompt, recentMessages, newMessage, projectVideos } = input
  let assistantText: string
  let outputSceneIds: string[] = []
  let tokensUsed = 0

  switch (intent.type) {
    case 'similarity': {
      const result = await handleSimilarityIntent(recentMessages, prompt, projectVideos)
      assistantText = result.assistantText
      outputSceneIds = result.outputSceneIds
      tokensUsed = result.tokensUsed
      break
    }

    case 'analytics': {
      const result = await handleAnalyticsIntent(prompt, recentMessages)
      assistantText = result.assistantText
      tokensUsed = result.tokensUsed
      break
    }

    case 'refinement': {
      const result = await handleRefinementIntent(prompt, recentMessages, newMessage, intent, projectVideos)
      assistantText = result.assistantText
      outputSceneIds = result.outputSceneIds
      tokensUsed = result.tokensUsed
      break
    }

    case 'compilation': {
      const result = await handleCompilationIntent(prompt, recentMessages, newMessage, projectVideos)
      assistantText = result.assistantText
      outputSceneIds = result.outputSceneIds
      tokensUsed = result.tokensUsed
      break
    }

    case 'general':
    default: {
      const response = await generateGeneralResponse(prompt, recentMessages)
      assistantText = response.data || 'Sorry, I could not generate a response.'
      tokensUsed = response.tokens
      break
    }
  }

  return { assistantText, outputSceneIds, tokensUsed }
}
