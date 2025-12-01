import {
  classifyIntent,
  generateActionFromPrompt,
  generateAnalyticsResponse,
  generateCompilationResponse,
  generateGeneralResponse,
} from '@shared/services/modelRouter'
import { getVideoWithScenesBySceneIds, hybridSearch } from '@shared/services/vectorDb'
import type { ActionFunction, LoaderFunction } from 'react-router'
import { prisma } from '~/services/database'
import { getVideoAnalytics } from '@shared/utils/analytics'

export const loader: LoaderFunction = async ({ params }) => {
  const chatId = params.id
  if (!chatId) throw new Response('Chat ID required', { status: 400 })

  const messages = await prisma.chatMessage.findMany({
    where: { chatId },
    orderBy: { createdAt: 'asc' },
  })
  const chat = await prisma.chat.findFirst({
    where: { id: chatId },
    select: {
      lockReason: true,
      isLocked: true,
    },
  })

  const messagesWithScenes = await Promise.all(
    messages.map(async (message) => {
      if (!message.outputSceneIds || message.outputSceneIds.length === 0) {
        return {
          ...message,
          outputScenes: null,
        }
      }

      const outputScenes = await getVideoWithScenesBySceneIds(message.outputSceneIds)

      return {
        ...message,
        outputScenes,
      }
    })
  )

  return { messages: messagesWithScenes, chat }
}

export const action: ActionFunction = async ({ request, params }) => {
  const chatId = params.id
  if (!chatId) throw new Response('Chat ID required', { status: 400 })

  const { prompt } = await request.json()
  if (!prompt) throw new Response('Invalid request', { status: 400 })

  await prisma.chatMessage.create({
    data: {
      chatId,
      sender: 'user',
      text: prompt,
    },
  })

  const recentMessages = await prisma.chatMessage.findMany({
    where: { chatId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  const intentResult = await classifyIntent(prompt, recentMessages)

  if (intentResult.error || !intentResult.data) {
    const messageAssistant = await prisma.chatMessage.create({
      data: {
        chatId,
        sender: 'assistant',
        text: 'Failed to classify intent.',
        isError: true,
        tokensUsed: intentResult.tokens,
      },
    })
    return {
      ...messageAssistant,
      outputScenes: [],
    }
  }

  const intent = intentResult.data
  let assistantText: string
  let outputSceneIds: string[] = []
  let tokensUsed = intentResult.tokens

  switch (intent.type) {
    case 'analytics': {
      const analytics = await getVideoAnalytics(prompt)
      const response = await generateAnalyticsResponse(prompt, analytics, recentMessages)
      assistantText = response.data || 'Sorry, I could not generate an analytics response.'
      tokensUsed += response.tokens
      break
    }

    case 'compilation': {
      const { data: searchParams, tokens, error } = await generateActionFromPrompt(prompt, recentMessages)
      tokensUsed += tokens

      if (error || !searchParams) {
        assistantText = error || 'Sorry, I could not understand your request.'
        break
      }

      const results = await hybridSearch(searchParams)

      outputSceneIds = results.flatMap((result) => result.scenes.map((scene) => scene.id))
      const response = await generateCompilationResponse(prompt, outputSceneIds.length, recentMessages)
      assistantText = response.data || 'Sorry, I could not generate a compilation response.'
      tokensUsed += response.tokens
      break
    }

    case 'general':
    default: {
      const response = await generateGeneralResponse(prompt, recentMessages)
      assistantText = response.data || 'Sorry, I could not generate a response.'
      tokensUsed += response.tokens
      break
    }
  }

  const messageAssistant = await prisma.chatMessage.create({
    data: {
      chatId,
      sender: 'assistant',
      text: assistantText,
      outputSceneIds,
      tokensUsed,
    },
  })

  return {
    ...messageAssistant,
    outputScenes: await getVideoWithScenesBySceneIds(outputSceneIds),
  }
}
