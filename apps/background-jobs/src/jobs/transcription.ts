import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { existsSync, promises as fs, writeFileSync } from 'fs'
import { transcribeAudio } from '@shared/utils/transcribe'
import { JobStatus, JobStage } from '@prisma/client'
import { logger } from '@shared/services/logger'
import { VideoProcessingData } from '@shared/types/video'
import { updateJob } from '../services/videoIndexer'
import path from 'path'
import { frameAnalysisQueue } from 'src/queue'
import { pythonService } from '@shared/services/pythonService'
import { USE_EXTERNAL_ML_SERVICE } from '@shared/constants'

async function processVideo(job: Job<VideoProcessingData>) {
  const { videoPath, jobId, forceReIndexing = false, transcriptionPath } = job.data

  logger.debug(
    {
      jobId,
      videoPath,
      bullJobId: job.id,
      transcriptionPath
    },
    'Starting transcription job'
  )

  try {
    if (!pythonService.isServiceRunning()) {
      await pythonService.start()
    }

    const videoDir = path.dirname(transcriptionPath)
    await fs.mkdir(videoDir, { recursive: true })

    logger.debug({ jobId, videoDir }, 'Ensured video directory exists')

    await updateJob(job, { stage: JobStage.transcribing, overallProgress: 10 })

    const transcriptionExists = existsSync(transcriptionPath)

    const transcriptionStart = Date.now()

    if (forceReIndexing || !transcriptionExists) {
      logger.debug({ jobId, transcriptionPath }, 'Starting audio transcription')

      const result = await transcribeAudio(videoPath, transcriptionPath, jobId, async ({ progress, job_id }) => {
        if (job_id !== jobId) {
          logger.warn({ jobId, receivedJobId: job_id }, 'Received callback for different job')
          return
        }
        const overallProgress = 10 + progress * 0.3
        await updateJob(job, { stage: JobStage.transcribing, progress, overallProgress })
      })

      logger.debug({ jobId, transcriptionPath }, 'Transcription completed and saved')

      if (USE_EXTERNAL_ML_SERVICE) {
        writeFileSync(transcriptionPath, JSON.stringify(result), 'utf-8')
      }
    } else {
      logger.debug({ jobId, transcriptionPath }, 'Skipping transcription - using cached file')
    }

    const transcriptionTime = (Date.now() - transcriptionStart) / 1000
    logger.debug(
      {
        jobId,
        transcriptionTime,
        bullJobId: job.id,
      },
      'Transcription processing complete'
    )

    await updateJob(job, { transcriptionTime })

    return { transcriptionPath, videoPath }
  } catch (error) {
    logger.error(
      { jobId, videoPath, error, stack: error instanceof Error ? error.stack : undefined },
      'Error during transcription'
    )
    await updateJob(job, { status: JobStatus.error })
    throw error
  }
}

export const audioTranscriptionWorker = new Worker('transcription', processVideo, {
  connection,
  concurrency: 1,
  lockDuration: 30 * 60 * 1000,
  stalledInterval: 30 * 1000,
  maxStalledCount: 3,
})

audioTranscriptionWorker.on('completed', async (job: Job) => {
  await frameAnalysisQueue.add('frame-analysis', job.data, {
    removeOnComplete: false,
    removeOnFail: false,
  })
})
