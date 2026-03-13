import express from 'express'
import path from 'path'
import { addVideoIndexingJob, addVideoUpdateJob } from '../services/videoIndexer'
import { logger } from '@shared/services/logger'
import { FolderModel, generateId, JobModel } from '@db/index'
import { stat } from 'fs/promises'
import { VideoReIndexingSchema, VideoUpdateSchema } from '../schemas/indexer'
import { removeFailedJobs } from '@background-jobs/utils/jobs'
import { DEMO_VIDEOS, MEDIA_BASE_PATH } from '@shared/constants'
import { existsSync, mkdirSync } from 'fs';
import { EXCLUDED_VIDEO_PATTERNS, SUPPORTED_VIDEO_PATTERNS } from '@shared/constants/video'
import { pipeline } from 'stream/promises'
import { createWriteStream } from 'fs'

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

router.post('/retry', async (req, res) => {
  try {
    const userId = req.userId
    const failedJobs = await JobModel.findMany({
      where: {
        status: 'error',
      },
    })
    await removeFailedJobs(failedJobs.map((job) => job.id))

    for (const job of failedJobs) {
      const newJob = await JobModel.create({
        videoPath: job.videoPath,
        folderId: job.folderId,
        fileSize: job.fileSize,
        userId: job.userId,
      })
      await addVideoIndexingJob({
        jobId: newJob.id,
        videoPath: job.videoPath
      })
    }

    await JobModel.deleteMany({
      where: {
        status: 'error',
        userId,
      },
    })
    res.json({
      message: 'All video indexing failed jobs has been triggered',
    })
  } catch (error) {
    logger.error({ error }, 'Failed to retry failed jobs')
    res.status(500).json({ error: 'Failed to retry failed jobs' })
  }
})
router.put('/update', async (req, res) => {
  try {
    const { data, success } = VideoUpdateSchema.safeParse(req.body)
    if (!success) {
      return res.status(400).json({ error: 'Invalid request body' })
    }

    await addVideoUpdateJob(data)

    res.json({
      message: 'Video has been sent to update',
    })
  } catch (error) {
    logger.error({ error }, 'Failed to update video metadata')
    res.status(500).json({ error: 'Failed to update video metadata' })
  }
})

router.post('/import-videos', async (req, res) => {
  try {
    const demoDir = path.join(MEDIA_BASE_PATH, 'Edit Mind Demo')

    if (!existsSync(demoDir)) {
      mkdirSync(demoDir, { recursive: true })
    }

    const folder = await FolderModel.upsert({
      where: {
        path: demoDir,
      },
      create: {
        path: demoDir,
        watcherEnabled: false,
        userId: req.userId,
        excludePatterns: EXCLUDED_VIDEO_PATTERNS,
        includePatterns: SUPPORTED_VIDEO_PATTERNS,
        id: generateId()
      },
      update: {
        lastScanned: new Date()
      }
    })

    const count = await JobModel.count({
      where: {
        folderId: folder.id
      },
    })

    if (count > 0) {
      return res.json({ message: 'Demo videos already imported and we are processing them' })
    }

    for (const { filename, url } of DEMO_VIDEOS) {
      const dest = path.join(demoDir, filename)

      if (!existsSync(dest)) {
        const response = await fetch(url)

        if (!response.ok || !response.body) {
          throw new Error(`Failed to download ${filename}: ${response.statusText}`)
        }

        await pipeline(response.body, createWriteStream(dest))
      }

      const stats = await stat(dest)

      const job = await JobModel.create({
        videoPath: dest,
        userId: folder.userId,
        folderId: folder.id,
        fileSize: BigInt(stats.size),
      })
      await addVideoIndexingJob(
        {
          videoPath: dest,
          jobId: job.id,
          forceReIndexing: true
        },
        100
      )
    }
    await FolderModel.update(folder.id, {
      watcherEnabled: true
    })

    res.json({ message: 'Demo videos imported successfully' })
  } catch (error) {
    logger.error({ error }, 'Failed to import demo videos')
    res.status(500).json({ error: 'Failed to import demo videos' })
  }
})

export default router
