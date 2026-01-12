import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { existsSync, writeFileSync } from 'fs'
import { analyzeVideo } from '@shared/utils/frameAnalyze'
import { JobStatus, JobStage } from '@prisma/client'
import { logger } from '@shared/services/logger'
import { VideoProcessingData } from '@shared/types/video'
import { updateJob } from '../services/videoIndexer'
import { sceneCreationQueue } from '../queue'
import { pythonService } from '@shared/services/pythonService'
import { USE_EXTERNAL_ML_SERVICE } from '@shared/constants'
import { dirname } from 'path'
import { mkdir } from 'fs/promises'

async function processVideo(job: Job<VideoProcessingData>) {
  const { videoPath, jobId, forceReIndexing = true, analysisPath } = job.data

  logger.debug({ jobId, videoPath }, 'Starting frame analysis job')

  try {
    if (!pythonService.isServiceRunning()) {
      await pythonService.start()
    }
    const videoDir = dirname(analysisPath)
    await mkdir(videoDir, { recursive: true })

    const analysisExists = existsSync(analysisPath)

    logger.debug(
      {
        jobId,
        analysisExists,
        willSkipAnalysis: analysisExists && !forceReIndexing,
      },
      'Checking existing analysis files'
    )

    const analysisStart = Date.now()

    if (forceReIndexing || !analysisExists) {
      logger.debug({ jobId, videoPath, analysisPath }, 'Starting frame analysis')

      await updateJob(job, { stage: JobStage.frame_analysis, overallProgress: 40 })

      const result = await analyzeVideo(videoPath, analysisPath, jobId, async ({ progress, job_id }) => {
        if (job_id !== jobId) {
          logger.warn({ jobId, receivedJobId: job_id }, '⚠️ Received callback for different job')
          return
        }
        const overallProgress = 40 + progress * 0.3 // 40-70%
        await updateJob(job, { stage: JobStage.frame_analysis, progress: progress, overallProgress })
      })
      if (USE_EXTERNAL_ML_SERVICE) {
        writeFileSync(analysisPath, JSON.stringify(result), 'utf-8')
      }

      logger.debug({ jobId, analysisPath }, 'Frame analysis completed and saved')
    } else {
      logger.debug({ jobId, analysisPath }, 'Skipping frame analysis - using cached file')
    }

    const analysisDuration = (Date.now() - analysisStart) / 1000
    logger.debug({ jobId, analysisDuration }, 'Frame analysis done')
    await updateJob(job, { frameAnalysisTime: analysisDuration })

    await sceneCreationQueue.add('scene-creation', job.data, {
      removeOnComplete: false,
      removeOnFail: false,
    })

    return { analysisPath, videoPath }
  } catch (error) {
    logger.error(
      { jobId, videoPath, error, stack: error instanceof Error ? error.stack : undefined },
      'Error during frame analysis'
    )
    await updateJob(job, { status: JobStatus.error })
    throw error
  }
}

export const frameAnalysisWorker = new Worker('frame-analysis', processVideo, {
  connection,
  concurrency: 1,
  lockDuration: 5 * 60 * 1000,
  stalledInterval: 15 * 1000,
  maxStalledCount: 3,
  lockRenewTime: 30 * 1000,
})
