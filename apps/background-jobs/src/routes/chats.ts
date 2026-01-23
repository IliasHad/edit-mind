import express from 'express'
import { chatQueue, videoStitcherQueue } from '@background-jobs/queue'
import { ChatRequestSchema, ChatStitcherRequestSchema } from '../schemas/chat'
import { ChatModel } from '@db/index'
import { logger } from '@shared/services/logger'

const router = express.Router()

router.post('/:id/messages', async (req, res) => {
  const { id } = req.params

  try {
    const { data: validatedData, error } = ChatRequestSchema.safeParse(req.body)

    if (!validatedData || error) {
      return res.status(400).json({ error: 'Invalid chat data' })
    }
    const chat = await ChatModel.findById(id)

    const job = await chatQueue.add('process-chat-message', {
      chatId: chat?.id,
      prompt: validatedData.prompt,
      projectId: validatedData.projectId,
    })

    return res.json({
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

  try {
    const { data, error } = ChatStitcherRequestSchema.safeParse(req.body)

    if (!data || error) {
      return res.status(400).json({ error: 'Invalid chat message stitcher data' })
    }

    const { selectedSceneIds, messageId } = data
    const chat = await ChatModel.findById(id)
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
