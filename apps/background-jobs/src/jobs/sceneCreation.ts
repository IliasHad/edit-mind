import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { existsSync, promises as fs } from 'fs'
import { Scene } from '@shared/types/scene'
import { createScenes } from '@shared/utils/scenes'
import { JobStatus, JobStage } from '@prisma/client'
import { logger } from '@shared/services/logger'
import { VideoProcessingData } from '@shared/types/video'
import { updateJob } from '../services/videoIndexer'
import { unlink } from 'fs/promises'
import { audioEmbeddingQueue, textEmbeddingQueue, visualEmbeddingQueue } from 'src/queue'
import { Analysis } from '@shared/types/analysis';

async function processVideo(job: Job<VideoProcessingData>) {
  const { videoPath, jobId, forceReIndexing = false, transcriptionPath, analysisPath, scenesPath } = job.data

  logger.info({ jobId, videoPath }, '🎬 Starting scene creation')

  try {
    if (!existsSync(analysisPath)) {
      logger.error({ jobId, analysisPath }, '❌ Analysis file not found')
      throw new Error(`Analysis file not found at: ${analysisPath}`)
    }

    if (!existsSync(transcriptionPath)) {
      logger.error({ jobId, transcriptionPath }, '❌ Transcription file not found')
      throw new Error(`Transcription file not found at: ${transcriptionPath}`)
    }

    logger.info({ jobId, analysisPath, transcriptionPath }, '📂 Reading prerequisite files')

    const analysisData = (await fs.readFile(analysisPath, 'utf-8').then(JSON.parse)) as Analysis
    const transcriptionData = await fs.readFile(transcriptionPath, 'utf-8').then(JSON.parse)

    logger.info({ jobId }, '✅ Prerequisite files loaded')

    if (analysisData.plugin_performance) {
      await updateJob(job, {
        frameAnalysisPlugins: analysisData.plugin_performance.map((plugin) => ({
          name: plugin.plugin_name,
          duration: plugin.total_duration_seconds,
          frameProcessed: plugin.frames_processed,
        })),
      })
    }
    await updateJob(job, { stage: JobStage.creating_scenes, overallProgress: 70 })

    const scenesStart = Date.now()
    const scenesExists = existsSync(scenesPath)

    let scenes: Scene[]
    if (forceReIndexing || !scenesExists) {
      logger.info({ jobId, scenesPath }, '🎬 Creating scenes')
      scenes = await createScenes(analysisData, transcriptionData, videoPath)
      await fs.writeFile(scenesPath, JSON.stringify(scenes, null, 2))
      logger.info({ jobId, sceneCount: scenes.length }, '✅ Scenes created and saved')
    }

    const scenesDuration = (Date.now() - scenesStart) / 1000

    try {
      await unlink(analysisPath)
      await unlink(transcriptionPath)
      logger.info({ jobId }, '🧹 Cleaned up intermediate files')
    } catch (error) {
      logger.warn({ jobId, error }, '⚠️ Failed to clean up intermediate files')
    }

    await updateJob(job, { sceneCreationTime: scenesDuration })

    return { scenesPath }
  } catch (error) {
    logger.error(
      { jobId, videoPath, error, stack: error instanceof Error ? error.stack : undefined },
      '❌ Scene creation failed'
    )
    await updateJob(job, { status: JobStatus.error })
    throw error
  }
}

export const sceneCreationWorker = new Worker('scene-creation', processVideo, {
  connection,
  concurrency: 3,
  lockDuration: 10 * 60 * 1000,
  stalledInterval: 30 * 1000,
  maxStalledCount: 3,
})

sceneCreationWorker.on('completed', async (job: Job<VideoProcessingData>) => {
  logger.info({ jobId: job.data?.jobId }, '✅ Scene creation completed, adding embedding jobs')

  await Promise.all([
    textEmbeddingQueue.add('text-embedding', job.data, {
      removeOnComplete: false,
      removeOnFail: false,
    }),
    audioEmbeddingQueue.add('audio-embedding', job.data, {
      removeOnComplete: false,
      removeOnFail: false,
    }),
    visualEmbeddingQueue.add('visual-embedding', job.data, {
      removeOnComplete: false,
      removeOnFail: false,
    }),
  ])
})
