import { redirect, type ActionFunctionArgs } from 'react-router'
import { prisma } from '~/services/database'
import { getUser } from '~/services/user.sever'
import { nanoid } from 'nanoid'
import { handleIncomingMessage } from '~/services/chat.server'
import { logger } from '@shared/services/logger'

export const action = async ({ request }: ActionFunctionArgs) => {
  const { prompt, projectId } = await request.json()
  if (!prompt) throw new Response('Invalid request', { status: 400 })

  const user = await getUser(request)
  if (!user) throw new Response('Unauthorized', { status: 401 })

  const chat = await prisma.chat.create({
    data: {
      userId: user.id,
      title: prompt.substring(0, 50),
      id: nanoid(4),
      projectId: projectId,
    },
  })

  try {
    await handleIncomingMessage(chat, prompt, projectId)

    return redirect(`/app/prompt/${chat.id}`)
  } catch (error) {
    logger.error(error)
    return new Response(JSON.stringify({ chatId: chat.id }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}
