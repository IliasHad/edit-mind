import { Worker, Job } from 'bullmq'
import { prisma } from '../services/db'
import { connection } from '../services/redis'
import path from 'path'
import { existsSync, mkdirSync, promises as fs } from 'fs'
import { PROCESSED_VIDEOS_DIR, THUMBNAILS_DIR } from '@shared/constants'
import { Scene } from '@shared/types/scene'
import { generateThumbnail } from '@shared/utils/videos'
import { createScenes } from '@shared/utils/scenes'
import { embedScenes } from '@shared/utils/embed'
import { analyzeVideo } from '@shared/utils/frameAnalyze'
import { transcribeAudio } from '@shared/utils/transcribe'
import { pythonService } from '@shared/services/pythonService'
import { JobStatus, JobStage } from '@prisma/client'
import { logger } from '@shared/services/logger'
import { Analysis } from '@shared/types/analysis'

async function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

async function updateJob(
  jobId: string,
  data: Partial<{
    stage: JobStage
    progress: number
    overallProgress: number
    status: JobStatus
    thumbnailPath?: string
    fileSize?: bigint
  }>
) {
  logger.info({ jobId, stage: data.stage, overallProgress: data.overallProgress }, '📊 Job progress update')
  await prisma.job.updateMany({
    where: { id: jobId },
    data: { ...data, updatedAt: new Date() },
  })
}

async function processVideo(job: Job<{ videoPath: string; jobId: string; forceReIndexing?: boolean }>) {
  const { videoPath, jobId, forceReIndexing = false } = job.data

  logger.info({ jobId, videoPath }, '📥 Starting video indexing job')

  const videoDir = path.join(PROCESSED_VIDEOS_DIR, path.basename(videoPath))
  const transcriptionPath = path.join(videoDir, 'transcription.json')
  const analysisPath = path.join(videoDir, 'analysis.json')
  const scenesPath = path.join(videoDir, 'scenes.json')

  if (!pythonService.isServiceRunning()) {
    logger.info({ jobId }, '🐍 Starting Python service')
    await pythonService.start()
  } else {
    logger.debug({ jobId }, '🐍 Python service already running')
  }

  await Promise.all([ensureDir(PROCESSED_VIDEOS_DIR), ensureDir(THUMBNAILS_DIR), ensureDir(videoDir)])

  const fileStats = await fs.stat(videoPath)
  logger.debug({ jobId, fileSize: fileStats.size, videoPath }, '📄 Video file stats')

  await updateJob(jobId, {
    status: JobStatus.processing,
    stage: JobStage.starting,
    overallProgress: 0,
    progress: 0,
    fileSize: BigInt(fileStats.size),
  })
  await job.updateProgress(0)

  try {
    const jobStart = new Date().getTime()
    const thumbnailPath = path.join(THUMBNAILS_DIR, `${path.basename(videoPath)}.jpg`)
    try {
      logger.debug({ jobId, thumbnailPath }, '🎞 Generating thumbnail')
      await generateThumbnail(videoPath, thumbnailPath, 1)
      logger.debug({ jobId, thumbnailPath }, '✅ Thumbnail generated')

      await prisma.job.updateMany({
        where: { id: jobId },
        data: { thumbnailPath, updatedAt: new Date() },
      })
      logger.debug({ jobId, thumbnailPath }, '🎞 Updating job thumbnail')
    } catch (error) {
      logger.error({ jobId, error, thumbnailPath }, '❌ Thumbnail generation failed')
    }
    await job.updateProgress(10)

    await updateJob(jobId, { stage: JobStage.transcribing, overallProgress: 10 })

    const transcriptionExists = existsSync(transcriptionPath)
    const analysisExists = existsSync(analysisPath)
    const scenesExists = existsSync(scenesPath)

    logger.info(
      {
        jobId,
        transcriptionExists,
        analysisExists,
        scenesExists,
        willSkipTranscription: transcriptionExists,
        willSkipAnalysis: analysisExists,
        willSkipScenes: scenesExists,
      },
      '🔍 Checking existing processed files'
    )

    const transcriptionStart = Date.now()

    if (!transcriptionExists) {
      logger.info({ jobId, transcriptionPath }, '🎤 Starting audio transcription')
      await transcribeAudio(videoPath, transcriptionPath, jobId, async ({ progress, job_id }) => {
        logger.debug({ jobId, progress, job_id }, '🎤 Transcription progress')
        const overallProgress = 10 + progress * 0.3

        await updateJob(jobId, { stage: JobStage.transcribing, progress, overallProgress })
      })
      logger.info({ jobId }, '✅ Transcription completed')
    } else {
      logger.info({ jobId, transcriptionPath }, '⏭️ Skipping transcription - using cached file')
    }
    let transcriptionData
    try {
      transcriptionData = await fs.readFile(transcriptionPath, 'utf-8').then(JSON.parse)
    } catch {
      logger.info({ jobId, transcriptionPath }, 'has malformed JSON file')
      await transcribeAudio(videoPath, transcriptionPath, jobId, async ({ progress, job_id }) => {
        logger.debug({ jobId, progress, job_id }, '🎤 Transcription progress')
        const overallProgress = 10 + progress * 0.3

        await updateJob(jobId, { stage: JobStage.transcribing, progress, overallProgress })
      })
      logger.info({ jobId }, '✅ Transcription completed')
      transcriptionData = await fs.readFile(transcriptionPath, 'utf-8').then(JSON.parse)
    }
    await job.updateProgress(40)
    const transcriptionDuration = (Date.now() - transcriptionStart) / 1000
    logger.info({ jobId, transcriptionDuration }, '🎤 Transcription done')

    const analysisStart = Date.now()

    let analysisData: { analysis: Analysis; category: string }
    if (forceReIndexing || !analysisExists) {
      logger.info({ jobId, videoPath }, '🎥 Starting frame analysis')
      const result = await analyzeVideo(videoPath, jobId, async ({ progress, job_id }) => {
        const overallProgress = 40 + progress * 0.3

        logger.debug({ jobId, progress, job_id }, '🎥 Frame analysis progress')
        await updateJob(jobId, { stage: JobStage.frame_analysis, progress: progress, overallProgress })
      })
      await fs.writeFile(
        analysisPath,
        JSON.stringify({ analysis: result.analysis, category: result.category }, null, 2)
      )
      logger.info({ jobId, category: result.category }, '✅ Frame analysis completed')
      analysisData = result
    } else {
      logger.info({ jobId, analysisPath }, '⏭️ Skipping frame analysis - using cached file')
      const data = await fs.readFile(analysisPath, 'utf-8').then(JSON.parse)
      analysisData = { analysis: data.analysis, category: data.category }
    }
    const analysisDuration = (Date.now() - analysisStart) / 1000
    logger.info({ jobId, analysisDuration }, '🎥 Frame analysis done')
    const { analysis, category } = analysisData

    logger.info({ jobId, category }, '✅ Parallel processing completed')

    await job.updateProgress(70)
    await updateJob(jobId, { stage: JobStage.creating_scenes, overallProgress: 70 })

    const scenesStart = Date.now()

    let scenes: Scene[]
    if (forceReIndexing || !scenesExists) {
      logger.info({ jobId, scenesPath }, '🎬 Creating scenes')
      scenes = await createScenes(analysis, transcriptionData, videoPath)
      await fs.writeFile(scenesPath, JSON.stringify(scenes, null, 2))
      logger.info({ jobId, sceneCount: scenes.length }, '✅ Scenes created and saved')
    } else {
      logger.info({ jobId, scenesPath }, '⏭️ Skipping scene creation - using cached file')
      scenes = await fs.readFile(scenesPath, 'utf-8').then(JSON.parse)
    }

    logger.info({ jobId, sceneCount: scenes.length }, '📊 Scene data loaded')
    const scenesDuration = (Date.now() - scenesStart) / 1000
    logger.info({ jobId, scenesDuration, sceneCount: scenes.length }, '🎬 Scene creation done')

    await job.updateProgress(80)
    await updateJob(jobId, { stage: JobStage.embedding, overallProgress: 80 })

    logger.info({ jobId, videoPath, category, sceneCount: scenes.length }, '🔗 Starting scene embedding')
    const embeddingStart = Date.now()
    await embedScenes(scenes, videoPath, analysisData.category)
    const embeddingDuration = (Date.now() - embeddingStart) / 1000
    logger.info({ jobId, embeddingDuration }, '🔗 Embedding done')
    logger.info({ jobId }, '✅ Scene embedding completed')

    await job.updateProgress(100)
    await updateJob(jobId, {
      stage: JobStage.embedding,
      status: JobStatus.done,
      overallProgress: 100,
      progress: 100,
    })

    logger.info({ jobId, videoPath, totalScenes: scenes.length }, '🏁 Video indexing completed successfully')
    const totalDuration = (Date.now() - jobStart) / 1000
    logger.info({ jobId, totalDuration }, '🏁 Video indexing completed')
    logger.info(
      {
        jobId,
        videoPath,
        totalScenes: scenes.length,
        transcription: transcriptionDuration.toFixed(2) + 's',
        frameAnalysis: analysisDuration.toFixed(2) + 's',
        sceneCreation: scenesDuration.toFixed(2) + 's',
        embedding: embeddingDuration.toFixed(2) + 's',
        total: totalDuration.toFixed(2) + 's',
      },
      '🏁 Video indexing summary'
    )

    return { video: videoPath }
  } catch (error) {
    logger.error(
      { jobId, videoPath, error, stack: error instanceof Error ? error.stack : undefined },
      '❌ Error processing video'
    )
    await updateJob(jobId, { status: JobStatus.error })
    await job.updateProgress(0)
    throw error
  }
}

export const videoIndexerWorker = new Worker('video-indexing', processVideo, {
  connection,
  concurrency: 1,
  lockDuration: 15 * 60 * 1000,
  stalledInterval: 5 * 60 * 1000,
  maxStalledCount: 2,
})

videoIndexerWorker.on('failed', async (job: Job | undefined, err: Error) => {
  logger.error(
    {
      jobId: job?.data?.jobId,
      videoPath: job?.data?.videoPath,
      error: err,
      stack: err.stack,
    },
    '❌ Job failed'
  )
  if (job?.data?.jobId) await updateJob(job.data.jobId, { status: JobStatus.error })
})

videoIndexerWorker.on('closing', async () => {
  logger.info('🔄 Worker closing, shutting down Python service...')
  if (pythonService.isServiceRunning()) {
    await pythonService.stop()
    logger.info('✅ Python service stopped')
  }
})
