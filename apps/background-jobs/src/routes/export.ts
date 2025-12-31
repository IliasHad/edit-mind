import express from 'express'
import { exportQueue } from '../queue'
import { CollectionModel, ExportModel } from '@db/index'

const router = express.Router()

interface ExportRequest {
  sceneIds: string[]
  collectionId: string
  userId: string
}

router.post('/', async (req, res) => {
  const { sceneIds, collectionId, userId } = req.body as ExportRequest

  if (!sceneIds || !collectionId || !userId) {
    return res.status(400).json({ error: 'sceneIds, collectionId, and userId are required' })
  }

  try {
    const collection = await CollectionModel.findById(collectionId)
    const exportRecord = await ExportModel.create({
      userId,
      sceneIds,
      name: collection?.name ?? null,
      status: 'created',
    })

    await exportQueue.add(
      'export-scenes',
      {
        exportId: exportRecord.id,
      },
      {
        removeOnComplete: true,
      }
    )

    res.json({
      message: 'Export job queued',
      exportId: exportRecord.id,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to queue export job' })
  }
})

export default router
