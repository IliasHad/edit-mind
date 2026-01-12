import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { logger } from '@shared/services/logger'
import { VideoProcessingData } from '@shared/types/video'
import { updateJob } from '../services/videoIndexer'
import { JobStatus } from '@prisma/client'
import { unlink, rmdir } from 'fs/promises'
import { existsSync } from 'fs'
import { getByVideoSource } from '@vector/services/vectorDb'
import { importVideoFromVectorDb } from '../utils/videos'
import { suggestionCache } from '@search/services/suggestion'
import { dirname } from 'path';

async function finalizeVideo(job: Job<VideoProcessingData>) {
  const { jobId, videoPath, scenesPath, analysisPath, transcriptionPath } = job.data

  logger.debug({ jobId }, 'Starting video finalization')

  try {
    await updateJob(job, { status: 'done', overallProgress: 100 })

    logger.debug({ jobId }, 'Importing video to database')
    const video = await getByVideoSource(videoPath)

    if (video) {
      await importVideoFromVectorDb(video)
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

    await rmdir(videoDir)

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
