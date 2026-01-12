import express from 'express'
import { chatQueue, videoStitcherQueue } from '../queue'
import { ChatRequestSchema } from '../schemas/chat'
import { ChatModel } from '@db/index'
import { logger } from '@shared/services/logger'

const router = express.Router()

router.post('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params
    const validatedData = ChatRequestSchema.parse(req.body)
    const chat = await ChatModel.findById(id)

    const job = await chatQueue.add('process-chat-message', {
      chatId: chat?.id,
      prompt: validatedData.prompt,
      projectId: validatedData.projectId,
    })

    res.json({
      message: 'Chat message job queued',
      jobId: job.id,
    })
  } catch (error) {
    logger.error('Failed to queue chat message: ' + error)
    res.status(500).json({ error: 'Failed to queue chat message job' })
  }
})

router.post('/:id/stitcher', async (req, res) => {
  const { id } = req.params

  const { selectedSceneIds, messageId } = req.body
  const chat = await ChatModel.findById(id)

  try {
    await videoStitcherQueue.add('stitch-video', {
      selectedSceneIds,
      messageId,
      chatId: chat?.id,
    })

    res.json({
      message: 'Video stitching job queued',
    })
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: 'Failed to queue video stitching job' })
  }
})

export default router
