import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { promises as fs } from 'fs'
import { JobStatus, JobStage } from '@prisma/client'
import { logger } from '@shared/services/logger'
import { VideoProcessingData } from '@shared/types/video'
import { embedAudioScenes } from '@vector/utils/audioEmbedding'
import { updateJob } from '../services/videoIndexer'

async function processVideo(job: Job<VideoProcessingData>) {
  const { videoPath, jobId, scenesPath } = job.data

  try {
    const scenes = await fs.readFile(scenesPath, 'utf-8').then(JSON.parse)

    await updateJob(job, { stage: JobStage.embedding_audio, overallProgress: 80 })

    const embeddingStart = Date.now()

    await embedAudioScenes(scenes, videoPath)

    const embeddingDuration = (Date.now() - embeddingStart) / 1000
    logger.info({ jobId, embeddingDuration }, 'Audio Embedding done')

    await updateJob(job, {
      audioEmbeddingTime: embeddingDuration,
    })
    return { video: videoPath }
  } catch (error) {
    logger.error(
      { jobId, videoPath, error, stack: error instanceof Error ? error.stack : undefined },
      'Error embedding audios'
    )
    await updateJob(job, { status: JobStatus.error })
    throw error
  }
}

export const audioEmbeddingWorker = new Worker('audio-embedding', processVideo, {
  connection,
  concurrency: 1,
  lockDuration: 60 * 1000,
  stalledInterval: 15 * 1000,
  maxStalledCount: 3,
  lockRenewTime: 30 * 1000,
})
