import { ChatMessageModel, ChatModel } from '@db/index'
import { logger } from '@shared/services/logger'
import type { ActionFunction } from 'react-router'
import { ChatMessageExportSchema } from '~/features/chats/schemas'
import { backgroundJobsFetch } from '~/services/background.server'
import { requireUser } from '~/services/user.sever'

export const action: ActionFunction = async ({ request, params }) => {
  try {
    const { id: chatId } = params

    if (!chatId) {
      return new Response(JSON.stringify({ error: 'Chat ID required' }), { status: 404 })
    }

    const chat = await ChatModel.findById(chatId)

    if (!chat) {
      return new Response(JSON.stringify({ error: 'Chat not found' }), { status: 404 })
    }

    const user = await requireUser(request)

    const payload = await request.json()

    const form = ChatMessageExportSchema.safeParse(payload)

    if (!form.success) {
      throw new Error('Error getting scene ids')
    }

    const { selectedSceneIds } = form.data

    const newMessage = await ChatMessageModel.create({
      chatId: chatId,
      sender: 'assistant',
      text: '',
      intent: 'compilation',
      isThinking: true,
      stage: 'exporting_scenes',
      outputSceneIds: selectedSceneIds,
    })

    await backgroundJobsFetch(
      '/export',
      {
        selectedSceneIds,
        chatMessageId: newMessage.id,
      },
      user,
    )
    return new Response(
      JSON.stringify({ message: 'Your video request has been to the background jobs for exporting' }),
      { status: 200 }
    )
  } catch (error) {
    logger.error(error)
    return new Response(JSON.stringify({ error: 'Error queuing your video for exporting' }), { status: 500 })
  }
}
