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
    const scenes = await fs.readFile(scenesPath, 'utf-8').then(JSON.parse)

    await updateJob(job, { stage: JobStage.embedding_audio, overallProgress: 80 })

    const embeddingStart = Date.now()

    await embedVisualScenes(scenes, videoPath)

    const embeddingDuration = (Date.now() - embeddingStart) / 1000
    logger.info({ jobId, embeddingDuration }, '🔗 Embedding done')

    await updateJob(job, {
      audioEmbeddingTime: embeddingDuration,
    })
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

export const audioEmbeddingWorker = new Worker('audio-embedding', processVideo, {
  connection,
  concurrency: 3,
  lockDuration: 6 * 60 * 60 * 1000, // 6 hours (up from 15 minutes)
  stalledInterval: 30 * 1000, // every 30 seconds
  maxStalledCount: 3, // 3 attempts (up from 2)
})
