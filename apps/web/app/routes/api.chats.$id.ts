import { type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router'
import { requireUserId } from '~/services/user.sever'
import { logger } from '@shared/services/logger'
import { ChatModel } from '@db/index'

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { id } = params

  try {
    if (request.method === 'DELETE' && id) {
      await ChatModel.delete(id)
      return new Response(JSON.stringify({ message: 'Chat Message deleted.' }), {
        status: 200,
      })
    }
  } catch (error) {
    logger.error('Failed to send message to background jobs service' + error)
    return new Response(JSON.stringify({ error: 'Sorry, there was a problem connecting to the chat service.' }), {
      status: 500,
    })
  }
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { id } = params

  try {
    const userId = await requireUserId(request)

    const chat = await ChatModel.findFirst({
      where: {
        userId: userId,
        id,
      },
    })

    return {
      chat,
    }
  } catch (error) {
    logger.error('Error fetching suggestions: ' + error)
    return new Response(JSON.stringify({ error: 'Failed to fetch suggestions' }), { status: 500 })
  }
}
