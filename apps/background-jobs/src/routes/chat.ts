import express from 'express'
import { chatQueue } from '../queue'
import type { Chat } from '@prisma/client'

const router = express.Router()

interface ChatRequest {
  chat: Chat
  prompt: string
  projectId?: string | null
}

router.post('/', async (req, res) => {
  const { chat, prompt, projectId } = req.body as ChatRequest

  if (!chat || !prompt) {
    return res.status(400).json({ error: 'chat and prompt are required' })
  }

  try {
    await chatQueue.add(
      'process-chat-message',
      {
        chat,
        prompt,
        projectId,
      },
      {
        removeOnComplete: true,
      }
    )

    res.json({
      message: 'Chat message job queued',
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to queue chat message job' })
  }
})

export default router
