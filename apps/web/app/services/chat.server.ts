import type { Chat } from '@prisma/client'
import { logger } from '@shared/services/logger'
import { backgroundJobsFetch } from './background.server'
import { ChatMessageModel } from '@db/index'

export async function handleIncomingMessage(chat: Chat, prompt: string, projectId?: string | null) {
  try {
    await ChatMessageModel.create({
      chatId: chat.id,
      sender: 'user',
      text: prompt,
      isThinking: false,
    })
    await backgroundJobsFetch('/chat', { chat, prompt, projectId })
  } catch (error) {
    logger.error('Failed to send message to background jobs service' + error)
    await ChatMessageModel.create({
      chatId: chat.id,
      sender: 'assistant',
      text: 'Sorry, there was a problem connecting to the chat service.',
      isError: true,
    })
  }

  return {
    outputSceneIds: [],
    messageAssistant: null,
  }
}
