import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { logger } from '@shared/services/logger'
import { VideoProcessingData } from '@shared/types/video'
import { updateJob } from '../services/videoIndexer'
import { JobStatus } from '@prisma/client'
import { unlink, rm } from 'fs/promises'
import { existsSync } from 'fs'
import { getByVideoSource } from '@vector/services/db'
import { importVideoFromVectorDb } from '../utils/videos'
import { suggestionCache } from '@search/services/suggestion'
import { dirname } from 'path'
import { FolderModel, JobModel } from '@db/index'

async function finalizeVideo(job: Job<VideoProcessingData>) {
  const { jobId, videoPath, scenesPath, analysisPath, transcriptionPath } = job.data

  logger.debug({ jobId }, 'Starting video finalization')

  try {
    await updateJob(job, { status: 'done', overallProgress: 100 })

    logger.debug({ jobId }, 'Importing video to database')
    const video = await getByVideoSource(videoPath)

    if (video) {
      const folder = await importVideoFromVectorDb(video)

      if (folder) {
        await updateJob(job, { folderId: folder.id })
        // We need to count all processing and pending to update the folder status to be indexed in the case of zero jobs count
        const jobsCount = await JobModel.count({
          where: {
            status: {
              in: ['pending', 'processing'],
            },
            folderId: folder.id,
          },
        })
        if (jobsCount === 0) {
          await FolderModel.update(folder.id, {
            status: 'indexed',
          })
        }
      }
    }

    const filesToClean = [scenesPath, analysisPath, transcriptionPath]

    if (process.env.NODE_ENV === 'production') {
      logger.debug({ jobId }, 'Cleaning up temporary files')

      for (const filePath of filesToClean) {
        if (existsSync(filePath)) {
          try {
            await unlink(filePath)
            logger.info({ jobId, filePath }, 'Deleted temporary file')
          } catch (error) {
            logger.warn({ jobId, filePath, error }, 'Failed to delete temporary file')
          }
        }
      }
    }
    const videoDir = dirname(transcriptionPath)

    await rm(videoDir, {
      recursive: true,
    })

    await updateJob(job, { status: 'done', overallProgress: 100 })
    await suggestionCache.refresh()
    logger.debug({ jobId }, 'Video processing completed successfully')
  } catch (error) {
    logger.error({ jobId, error, stack: error instanceof Error ? error.stack : undefined }, 'Video finalization failed')
    await updateJob(job, { status: JobStatus.error })
    throw error
  }
}

export const videoFinalizationWorker = new Worker('video-finalization', finalizeVideo, {
  connection,
  concurrency: 5,
  lockDuration: 5 * 60 * 1000,
  stalledInterval: 30 * 1000,
  maxStalledCount: 3,
})
