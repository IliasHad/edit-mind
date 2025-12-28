import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { existsSync, promises as fs } from 'fs'
import { embedScenes } from '@vector/utils/textEmbedding'
import { pythonService } from '@shared/services/pythonService'
import { JobStatus, JobStage } from '@prisma/client'
import { logger } from '@shared/services/logger'
import { VideoProcessingData } from '@shared/types/video'
import { importVideoFromVectorDb } from 'src/utils/videos'
import { getByVideoSource } from '@vector/services/vectorDb'
import { updateJob } from '../services/videoIndexer'

async function processVideo(job: Job<VideoProcessingData>) {
  const { videoPath, jobId, scenesPath } = job.data

  logger.info({ jobId, videoPath }, '📥 Starting video indexing job')

  try {
    const scenesExists = existsSync(scenesPath)

    if (!scenesExists) {
      throw new Error('Scene file not found')
    }

    const scenes = await fs.readFile(scenesPath, 'utf-8').then(JSON.parse)

    await updateJob(job, { stage: JobStage.embedding_text, overallProgress: 80 })

    logger.info({ jobId, videoPath, sceneCount: scenes.length }, '🔗 Starting scene text embedding')
    const embeddingStart = Date.now()

    await embedScenes(scenes, videoPath)

    const embeddingDuration = (Date.now() - embeddingStart) / 1000
    logger.info({ jobId, embeddingDuration }, '🔗 Embedding done')

    await updateJob(job, {
      textEmbeddingTime: embeddingDuration,
    })

    const video = await getByVideoSource(videoPath)
    if (video) {
      await importVideoFromVectorDb(video)
    }
    await updateJob(job, { stage: JobStage.transcribing, textEmbeddingTime: embeddingDuration })

    return { video: videoPath }
  } catch (error) {
    logger.error(
      { jobId, videoPath, error, stack: error instanceof Error ? error.stack : undefined },
      '❌ Error processing video'
    )
    await updateJob(job, { status: JobStatus.error })
    throw error
  }
}

export const textEmbeddingWorker = new Worker('text-embedding', processVideo, {
  connection,
  concurrency: 3,
  lockDuration: 6 * 60 * 60 * 1000, // 6 hours (up from 15 minutes)
  stalledInterval: 30 * 1000, // every 30 seconds
  maxStalledCount: 3, // 3 attempts (up from 2)
})

textEmbeddingWorker.on('failed', async (job: Job | undefined, err: Error) => {
  logger.error(
    {
      jobId: job?.data?.jobId,
      videoPath: job?.data?.videoPath,
      error: err,
      stack: err.stack,
    },
    '❌ Job failed'
  )
  if (job?.data?.jobId) {
    await updateJob(job.data.jobId, { status: JobStatus.error })
  }
})

textEmbeddingWorker.on('closing', async () => {
  logger.info('🔄 Worker closing, shutting down Python service...')
  if (pythonService.isServiceRunning()) {
    await pythonService.stop()
    logger.info('✅ Python service stopped')
  }
})
