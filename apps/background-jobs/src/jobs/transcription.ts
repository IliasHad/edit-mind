import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { existsSync, promises as fs } from 'fs'
import { transcribeAudio } from '@shared/utils/transcribe'
import { JobStatus, JobStage } from '@prisma/client'
import { logger } from '@shared/services/logger'
import { VideoProcessingData } from '@shared/types/video'
import { updateJob } from '../services/videoIndexer'
import path from 'path'
import { frameAnalysisQueue } from 'src/queue'
import { pythonService } from '@shared/services/pythonService'

async function processVideo(job: Job<VideoProcessingData>) {
  const { videoPath, jobId, forceReIndexing = false, transcriptionPath, scenesPath } = job.data

  logger.info(
    {
      jobId,
      videoPath,
      bullJobId: job.id,
    },
    '🎤 Starting transcription job'
  )

  try {
    if (!pythonService.isServiceRunning()) {
          await pythonService.start()

    }

    const videoDir = path.dirname(transcriptionPath)
    await fs.mkdir(videoDir, { recursive: true })
    logger.info({ jobId, videoDir }, '📁 Ensured video directory exists')

    await updateJob(job, { stage: JobStage.transcribing, overallProgress: 10 })

    const transcriptionExists = existsSync(transcriptionPath)
    const sceneExist = existsSync(scenesPath)

    logger.info(
      {
        jobId,
        transcriptionExists,
        willSkipTranscription: transcriptionExists && !forceReIndexing,
      },
      '🔍 Checking existing transcription'
    )

    const transcriptionStart = Date.now()

    if (forceReIndexing || (!transcriptionExists && !sceneExist)) {
      logger.info({ jobId, transcriptionPath }, '🎤 Starting audio transcription')

      await transcribeAudio(videoPath, transcriptionPath, jobId, async ({ progress, job_id }) => {
        if (job_id !== jobId) {
          logger.warn({ jobId, receivedJobId: job_id }, '⚠️ Received callback for different job')
          return
        }
        const overallProgress = 10 + progress * 0.3 // 10-40%
        await updateJob(job, { stage: JobStage.transcribing, progress, overallProgress })
      })

      logger.info({ jobId, transcriptionPath }, '✅ Transcription completed and saved')
    } else {
      logger.info({ jobId, transcriptionPath }, '⏭️ Skipping transcription - using cached file')
    }

    const transcriptionTime = (Date.now() - transcriptionStart) / 1000
    logger.info(
      {
        jobId,
        transcriptionTime,
        bullJobId: job.id,
      },
      '🎤 Transcription processing complete, waiting for children'
    )

    await updateJob(job, { transcriptionTime })

    return { transcriptionPath, videoPath }
  } catch (error) {
    logger.error(
      { jobId, videoPath, error, stack: error instanceof Error ? error.stack : undefined },
      '❌ Error during transcription'
    )
    await updateJob(job, { status: JobStatus.error })
    throw error
  }
}

export const audioTranscriptionWorker = new Worker('transcription', processVideo, {
  connection,
  concurrency: 3,
  lockDuration: 30 * 60 * 1000, // 10 minutes
  lockRenewTime: 20 * 60 * 1000, // Renew lock every 5 minutes while processing
  stalledInterval: 30 * 1000,
  maxStalledCount: 3,
})

audioTranscriptionWorker.on('completed', async (job: Job) => {
  await frameAnalysisQueue.add('frame-analysis', job.data, {
    removeOnComplete: false,
    removeOnFail: false,
  })
})
