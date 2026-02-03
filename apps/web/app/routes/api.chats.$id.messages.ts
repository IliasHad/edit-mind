import { getVideoWithScenesBySceneIds } from '@vector/services/db'
import type { ActionFunction, LoaderFunctionArgs } from 'react-router'
import { logger } from '@shared/services/logger'
import { requireUser, requireUserId } from '~/services/user.server'
import { ChatMessageModel, ChatModel } from '@db/index'
import { backgroundJobsFetch } from '~/services/background.server'
import { ChatMessageCreateSchema } from '~/features/chats/schemas'
import { MAX_MESSAGES_PER_CHAT } from '@shared/constants'

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { id } = params

  try {
    const userId = await requireUserId(request)

    const chat = await ChatModel.findFirst({
      where: {
        userId,
        id,
      },
    })

    if (!chat) return new Response(JSON.stringify({ error: 'Chat not found' }), { status: 404 })

    const messages = await ChatMessageModel.findMany({
      where: {
        chatId: chat?.id,
      },
      orderBy: {
        createdAt: 'asc',
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

    return {
      chat,
      messages: messagesWithScenes.map((message) => ({
        ...message,
        tokensUsed: parseInt(message.tokensUsed.toString() ?? '0'),
      })),
    }
  } catch (error) {
    logger.error('Error fetching suggestions: ' + error)
    return new Response(JSON.stringify({ error: 'Failed to fetch suggestions' }), { status: 500 })
  }
}

export const action: ActionFunction = async ({ request, params }) => {
  const payload = await request.json()
  const { id } = params

  if (!id) {
    return new Response(JSON.stringify({ error: 'ID is required' }), {
      status: 500,
    })
  }

  try {
    const { success, data } = ChatMessageCreateSchema.safeParse(payload)

    if (!success) return new Response(JSON.stringify({ error: 'Invalid chat message input' }), { status: 400 })

    const user = await requireUser(request)

    const { prompt } = data

    const chat = await ChatModel.findFirst({ where: { id, userId: user.id } })

    if (!chat) {
      return new Response(JSON.stringify({ error: 'Chat not found' }), {
        status: 404,
      })
    }

    const messagesCount = await ChatMessageModel.countByChatId(chat.id)

    if (messagesCount >= MAX_MESSAGES_PER_CHAT) {
      await ChatModel.update(chat.id, {
        lockReason: 'You exceed the number of messages you can have per chat, please create a new chat',
        isLocked: true,
      })
      return new Response(
        JSON.stringify({ error: 'You exceed the number of messages you can have per chat, please create a new chat' }),
        {
          status: 500,
        }
      )
    }

    if (chat) {
      const message = await ChatMessageModel.create({
        chatId: chat.id,
        sender: 'user',
        text: prompt,
        isThinking: false,
      })

      await backgroundJobsFetch(`/internal/chats/${chat.id}/messages`, { prompt }, user)
      return {
        message: {
          ...message,
          tokensUsed: parseInt(message.tokensUsed.toString() ?? '0'),
        },
      }
    }
    throw new Error('ailed to send message to background jobs service')
  } catch (error) {
    logger.error({ error }, 'Failed to send message to background jobs service')
    return new Response(JSON.stringify({ error: 'Sorry, there was a problem connecting to the chat service.' }), {
      status: 500,
    })
  }
}
