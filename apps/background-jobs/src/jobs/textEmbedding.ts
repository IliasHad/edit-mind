import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { existsSync, promises as fs } from 'fs'
import { embedScenes } from '@embedding-core/utils/textEmbedding'
import { JobStatus, JobStage } from '@prisma/client'
import { logger } from '@shared/services/logger'
import { VideoProcessingData } from '@shared/types/video'
import { updateJob } from '../services/videoIndexer'

async function processVideo(job: Job<VideoProcessingData>) {
  const { videoPath, jobId, scenesPath } = job.data

  try {
    const embeddingStart = Date.now()

    const scenesExists = existsSync(scenesPath)

    if (!scenesExists) {
      throw new Error('Scene file not found')
    }

    const scenes = await fs.readFile(scenesPath, 'utf-8').then(JSON.parse)

    await updateJob(job, { stage: JobStage.embedding_text, overallProgress: 80 })

    logger.debug({ jobId, videoPath, sceneCount: scenes.length }, 'Starting scene text embedding')

    await embedScenes(scenes, videoPath)

    const embeddingDuration = (Date.now() - embeddingStart) / 1000

    logger.debug({ jobId, embeddingDuration }, 'Embedding done')

    await updateJob(job, {
      textEmbeddingTime: embeddingDuration,
    })

    return { video: videoPath }
  } catch (error) {
    logger.error(
      { jobId, videoPath, error, stack: error instanceof Error ? error.stack : undefined },
      'Error processing text embedding'
    )
    await updateJob(job, { status: JobStatus.error })
    throw error
  }
}

export const textEmbeddingWorker = new Worker('text-embedding', processVideo, {
  connection,
  concurrency: 3,
  lockDuration: 60 * 1000,
  stalledInterval: 15 * 1000,
  maxStalledCount: 3,
  lockRenewTime: 30 * 1000,
})
