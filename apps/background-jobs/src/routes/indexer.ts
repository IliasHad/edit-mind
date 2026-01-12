import express from 'express'
import path from 'path'
import { addVideoIndexingJob } from '../services/videoIndexer'
import { logger } from '@shared/services/logger'
import { FolderModel, JobModel } from '@db/index'
import { stat } from 'fs/promises'
import { VideoReIndexingSchema } from '../schemas/indexer'

const router = express.Router()

router.post('/reindex', async (req, res) => {
  const form = VideoReIndexingSchema.safeParse(req.body)

  if (!form.success) {
    return res.status(400).json({ error: form.error.message })
  }

  const { jobId, videoPath, priority, forceReIndexing } = form.data

  try {
    let job

    if (jobId) {
      job = await JobModel.findById(jobId)

      if (!job) {
        throw new Error('Job not found')
      }
    } else {
      const folder = await FolderModel.findByPath(path.dirname(videoPath))

      if (!folder) {
        throw new Error('Folder not found')
      }
      const stats = await stat(videoPath)

      job = await JobModel.create({
        videoPath,
        userId: folder.userId,
        folderId: folder.id,
        fileSize: BigInt(stats.size),
      })
    }

    await addVideoIndexingJob(
      {
        videoPath,
        jobId: job.id,
        forceReIndexing,
      },
      priority
    )

    res.json({
      message: 'Video indexer job queued',
      jobId: job.id,
    })
  } catch (error) {
    logger.error({ error }, 'Failed to queue video indexer job')
    res.status(500).json({ error: 'Failed to queue video indexer job' })
  }
})

export default router
