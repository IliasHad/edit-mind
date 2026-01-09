import { type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router'
import { requireUser, requireUserId } from '~/services/user.sever'
import { logger } from '@shared/services/logger'
import { ChatMessageModel, ChatModel } from '@db/index'
import { backgroundJobsFetch } from '~/services/background.server'
import { ChatCreateSchema } from '~/features/chats/schemas'

export const action = async ({ request }: ActionFunctionArgs) => {
  const payload = await request.json()

  try {
    const { success, data, error } = ChatCreateSchema.safeParse(payload)

    if (!success) {
      logger.debug(error)
      return new Response(JSON.stringify({ error: 'Error validating your chat input' }), {
        status: 500,
      })
    }

    const user = await requireUser(request)

    const { projectId, prompt } = data

    const chat = await ChatModel.create({
      userId: user.id,
      title: prompt,
      projectId: projectId,
    })

    const message = await ChatMessageModel.create({
      chatId: chat.id,
      sender: 'user',
      text: prompt,
      isThinking: false,
    })

    await backgroundJobsFetch('/chat', { chat, prompt }, user)
    return {
      chat,
      message: {
        ...message,
        tokensUsed: parseInt(message.tokensUsed.toString() ?? '0'),
      },
    }
  } catch (error) {
    logger.error('Failed to send message to background jobs service' + error)
    return new Response(JSON.stringify({ error: 'Sorry, there was a problem connecting to the chat service.' }), {
      status: 500,
    })
  }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = parseInt(url.searchParams.get('limit') || '20', 10)
  const offset = (page - 1) * limit

  try {
    const userId = await requireUserId(request)

    const chats = await ChatModel.findMany({
      where: {
        userId: userId,
      },
      take: limit,
      skip: offset,
      orderBy: {
        createdAt: 'desc',
      },
    })
    const total = await ChatModel.count({
      where: {
        userId: userId,
      },
    })

    const totalPages = Math.ceil(total / limit)
    const hasMore = page < totalPages

    return {
      chats,
      page,
      total,
      limit,
      hasMore,
      totalPages,
    }
  } catch (error) {
    logger.error('Error fetching chats: ' + error)
    return {
      chats: [],
      page,
      total: 0,
      limit,
      hasMore: false,
      totalPage: 0,
    }
  }
}
