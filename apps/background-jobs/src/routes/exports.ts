import express from 'express'
import { exportQueue } from '../queue'
import { ChatMessageModel, CollectionModel, ExportModel } from '@db/index'
import { ExportProcessingRouteSchema } from '../schemas/export'
import { logger } from '@shared/services/logger'

const router = express.Router()

router.post('/', async (req, res) => {
  const form = ExportProcessingRouteSchema.safeParse(req.body)

  if (!form.success) {
    logger.debug(JSON.stringify(form.error))
    return res.status(400).json({ error: 'Error validation your export body' })
  }

  const { selectedSceneIds, collectionId, chatMessageId } = form.data

  try {
    if (collectionId) {
      const collection = await CollectionModel.findById(collectionId)
      if (collection) {
        const exportRecord = await ExportModel.create({
          userId: collection?.userId,
          sceneIds: selectedSceneIds,
          name: collection?.name ?? null,
          status: 'created',
        })

        await exportQueue.add('export-scenes-collection', {
          exportId: exportRecord.id,
          collectionId: collection.id,
        })
      }
    } else if (chatMessageId) {
      const message = await ChatMessageModel.findByIdWithChat(chatMessageId)

      if (message) {
        const exportRecord = await ExportModel.create({
          userId: message?.chat.userId,
          sceneIds: selectedSceneIds,
          name: message?.chat.title ?? null,
          status: 'created',
        })

        await exportQueue.add('export-scenes-chat-message', {
          exportId: exportRecord.id,
          chatMessageId,
          chatId: message.chatId,
        })
      }
    }

    res.json({
      message: 'Export job queued',
    })
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: 'Failed to queue export job' })
  }
})

export default router
