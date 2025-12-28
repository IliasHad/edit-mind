import { getVideoWithScenesBySceneIds } from '@vector/services/vectorDb'
import type { ActionFunction, LoaderFunction } from 'react-router'
import { prisma } from '~/services/database'
import { logger } from '@shared/services/logger'
import { handleIncomingMessage } from '~/services/chat.server'

export const loader: LoaderFunction = async ({ params }) => {
  const chatId = params.id
  if (!chatId) throw new Response('Chat ID required', { status: 400 })

  const messages = await prisma.chatMessage.findMany({
    where: { chatId },
    orderBy: { createdAt: 'asc' },
  })
  const chat = await prisma.chat.findFirst({
    where: { id: chatId },
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

  const chat = await prisma.chat.findFirst({
    where: { id: chatId },
  })

  const { prompt } = await request.json()
  if (!prompt && !chat) throw new Response('Invalid request', { status: 400 })

  if (!chat) throw new Response('Invalid request', { status: 400 })

  try {
    await handleIncomingMessage(chat, prompt, chat?.projectId)

    return {
      success: true,
    }
  } catch (error) {
    logger.error(error)
    throw new Response('Internal error', { status: 500 })
  }
}
