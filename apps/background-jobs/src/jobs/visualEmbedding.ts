import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { promises as fs } from 'fs'
import { JobStatus, JobStage } from '@prisma/client'
import { logger } from '@shared/services/logger'
import { VideoProcessingData } from '@shared/types/video'
import { embedVisualScenes } from '@vector/utils/visualEmbedding'
import { updateJob } from '../services/videoIndexer'

async function processVideo(job: Job<VideoProcessingData>) {
  const { videoPath, jobId, scenesPath } = job.data

  try {
    const embeddingStart = Date.now()

    const scenes = await fs.readFile(scenesPath, 'utf-8').then(JSON.parse)

    await updateJob(job, { stage: JobStage.embedding_visual, overallProgress: 80 })

    logger.debug({ jobId, videoPath, sceneCount: scenes.length }, 'Starting scene visual embedding')

    await embedVisualScenes(scenes, videoPath)

    const embeddingDuration = (Date.now() - embeddingStart) / 1000

    logger.debug({ jobId, embeddingDuration }, 'Visual Embedding done')

    await updateJob(job, {
      visualEmbeddingTime: embeddingDuration,
    })

    return { video: videoPath }
  } catch (error) {
    logger.error(
      { jobId, videoPath, error, stack: error instanceof Error ? error.stack : undefined },
      'Error processing visual embedding'
    )
    await updateJob(job, { status: JobStatus.error })
    throw error
  }
}

export const visualEmbeddingWorker = new Worker('visual-embedding', processVideo, {
  connection,
  concurrency: 1,
  lockDuration: 6 * 60 * 60 * 1000, // 6 hours
  stalledInterval: 2 * 60 * 1000,
  maxStalledCount: 3,
  lockRenewTime: 30 * 1000,
})
