import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { existsSync, promises as fs } from 'fs'
import { analyzeVideo } from '@shared/utils/frameAnalyze'
import { JobStatus, JobStage } from '@prisma/client'
import { logger } from '@shared/services/logger'
import { VideoProcessingData } from '@shared/types/video'
import { updateJob } from '../services/videoIndexer'
import { sceneCreationQueue } from 'src/queue'
import { pythonService } from '@shared/services/pythonService'

async function processVideo(job: Job<VideoProcessingData>) {
  const { videoPath, jobId, forceReIndexing = false, analysisPath, scenesPath } = job.data

  logger.info({ jobId, videoPath }, '🎥 Starting frame analysis job')

  try {
    if (!pythonService.isServiceRunning()) {
      await pythonService.start()
    }
    const analysisExists = existsSync(analysisPath)
    const sceneExist = existsSync(scenesPath)

    logger.info(
      {
        jobId,
        analysisExists,
        willSkipAnalysis: analysisExists && !forceReIndexing,
      },
      '🔍 Checking existing analysis files'
    )

    const analysisStart = Date.now()

    if (forceReIndexing || (!analysisExists && !sceneExist)) {
      logger.info({ jobId, videoPath, analysisPath }, '🎥 Starting frame analysis')

      await updateJob(job, { stage: JobStage.frame_analysis, overallProgress: 40 })

      const result = await analyzeVideo(videoPath, jobId, async ({ progress, job_id }) => {
        if (job_id !== jobId) {
          logger.warn({ jobId, receivedJobId: job_id }, '⚠️ Received callback for different job')
          return
        }
        const overallProgress = 40 + progress * 0.3 // 40-70%
        await updateJob(job, { stage: JobStage.frame_analysis, progress: progress, overallProgress })
      })

      await fs.writeFile(analysisPath, JSON.stringify(result.analysis))
      logger.info({ jobId, analysisPath }, '✅ Frame analysis completed and saved')
    } else {
      logger.info({ jobId, analysisPath }, '⏭️ Skipping frame analysis - using cached file')
    }

    const analysisDuration = (Date.now() - analysisStart) / 1000
    logger.info({ jobId, analysisDuration }, '🎥 Frame analysis done')
    await updateJob(job, { frameAnalysisTime: analysisDuration })

    return { analysisPath, videoPath }
  } catch (error) {
    logger.error(
      { jobId, videoPath, error, stack: error instanceof Error ? error.stack : undefined },
      '❌ Error during frame analysis'
    )
    await updateJob(job, { status: JobStatus.error })
    throw error
  }
}

export const frameAnalysisWorker = new Worker('frame-analysis', processVideo, {
  connection,
  concurrency: 3,
  lockDuration: 10 * 60 * 1000, // 10 minutes
  lockRenewTime: 5 * 60 * 1000, // Renew lock every 5 minutes while processing
  stalledInterval: 30 * 1000,
  maxStalledCount: 3,
})

frameAnalysisWorker.on('completed', async (job: Job) => {
  await sceneCreationQueue.add('scene-creation', job.data, {
    removeOnComplete: false,
    removeOnFail: false,
  })
})
