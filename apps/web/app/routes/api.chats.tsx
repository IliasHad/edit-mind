import type { ActionFunctionArgs } from 'react-router'
import {
  classifyIntent,
  generateActionFromPrompt,
  generateAnalyticsResponse,
  generateCompilationResponse,
  generateGeneralResponse,
} from '@shared/services/modelRouter'
import { hybridSearch } from '@shared/services/vectorDb'
import { prisma } from '~/services/database'
import { getVideoAnalytics } from '@shared/utils/analytics'
import { getUser } from '~/services/user.sever'
import type { ChatMessage } from '@prisma/client'
import { nanoid } from 'nanoid'

export const action = async ({ request }: ActionFunctionArgs) => {
  const { prompt } = await request.json()
  if (!prompt) throw new Response('Invalid request', { status: 400 })

  const user = await getUser(request)
  if (!user) throw new Response('Unauthorized', { status: 401 })

  const chat = await prisma.chat.create({
    data: {
      userId: user.id,
      title: prompt.substring(0, 50),
      id: nanoid(4),
    },
  })

  await prisma.chatMessage.create({
    data: {
      chatId: chat.id,
      sender: 'user',
      text: prompt,
      id: nanoid(4),
    },
  })

  const recentMessages: ChatMessage[] = []

  const intentResult = await classifyIntent(prompt, recentMessages)

  if (intentResult.error || !intentResult.data) {
    await prisma.chatMessage.create({
      data: {
        chatId: chat.id,
        sender: 'assistant',
        text: 'Failed to classify intent.',
        tokensUsed: intentResult.tokens,
        isError: true,
      },
    })

    return new Response(JSON.stringify({ chatId: chat.id }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      },
    })
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
        assistantText = 'Sorry, I could not understand your request.'
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

  await prisma.chatMessage.create({
    data: {
      chatId: chat.id,
      sender: 'assistant',
      text: assistantText,
      outputSceneIds,
      tokensUsed,
    },
  })

  return new Response(JSON.stringify({ chatId: chat.id }), {
    status: 201,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
