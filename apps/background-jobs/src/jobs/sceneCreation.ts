import { Worker, Job, FlowProducer } from 'bullmq'
import { connection } from '../services/redis'
import { existsSync, promises as fs } from 'fs'
import { createScenes } from '@shared/utils/scenes'
import { JobStatus, JobStage } from '@prisma/client'
import { logger } from '@shared/services/logger'
import { VideoProcessingData } from '@shared/types/video'
import { updateJob } from '../services/videoIndexer'
import { frameAnalysisQueue, transcriptionQueue } from '../queue'
import { Analysis } from '@shared/types/analysis'
import { deleteByVideoSource } from '@vector/services/vectorDb'
import { VideoModel } from '@db/index'

async function processVideo(job: Job<VideoProcessingData>) {
  const { videoPath, jobId, transcriptionPath, analysisPath, scenesPath } = job.data

  logger.info({ jobId, videoPath }, 'Starting scene creation')

  try {
    const scenesStart = Date.now()

    if (!existsSync(analysisPath)) {
      logger.error({ jobId, analysisPath }, 'Analysis file not found')
      throw new Error(`Analysis file not found at: ${analysisPath}`)
    }

    if (!existsSync(transcriptionPath)) {
      logger.error({ jobId, transcriptionPath }, 'Transcription file not found')
      throw new Error(`Transcription file not found at: ${transcriptionPath}`)
    }

    logger.info({ jobId, analysisPath, transcriptionPath }, '📂 Reading prerequisite files')
    let analysisData
    try {
      analysisData = (await fs.readFile(analysisPath, 'utf-8').then(JSON.parse)) as Analysis
    } catch (error) {
      await frameAnalysisQueue.add(
        'frame-analysis-rebuild',
        { ...job.data, forceReIndexing: true },
        {
          priority: 1,
        }
      )
      throw error
    }
    let transcriptionData
    try {
      transcriptionData = await fs.readFile(transcriptionPath, 'utf-8').then(JSON.parse)
    } catch (error) {
      await transcriptionQueue.add(
        'transcription-rebuild',
        { ...job.data, forceReIndexing: true },
        {
          priority: 1,
        }
      )
      throw error
    }

    logger.info({ jobId }, 'Prerequisite files loaded')

    if (analysisData && analysisData.plugin_performance) {
      await updateJob(job, {
        frameAnalysisPlugins: analysisData.plugin_performance.map((plugin) => ({
          name: plugin.plugin_name,
          duration: plugin.total_duration_seconds,
          frameProcessed: plugin.frames_processed,
        })),
      })
    }
    await updateJob(job, { stage: JobStage.creating_scenes, overallProgress: 70 })

    const scenes = await createScenes(analysisData, transcriptionData, videoPath)
    await fs.writeFile(scenesPath, JSON.stringify(scenes, null, 2))

    const scenesDuration = (Date.now() - scenesStart) / 1000
    await updateJob(job, { sceneCreationTime: Math.round(scenesDuration) })

    const video = await VideoModel.findFirst({
      where: {
        source: videoPath,
      },
    })

    if (video) {
      // TODO: In case we change the sample duration, scene id are based on video path and start time of the scene
      // let's say, the initial video has been process with 2.5 sample per seconds but we update the config to 2s and re index
      // we will end up with a scene that has start time( 0 - 2.5, 2.5 - 5) and second update, will have (0 - 2, 2 - 4)
      // when we're saving the vector video scene we're hashing the video path and scene start time
      // that why we will delete the video from the vector first before starting the text, audio and video embedding
      // this not an optimal solution for this case but I would love to get your ideas and contributions to it
      await deleteByVideoSource(videoPath)
    }

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

const flowProducer = new FlowProducer({ connection })

sceneCreationWorker.on('completed', async (job: Job<VideoProcessingData>) => {
  await flowProducer.add({
    name: 'video-finalization-flow',
    queueName: 'video-finalization',
    data: job.data,
    opts: {
      removeOnComplete: false,
      removeOnFail: false,
    },
    children: [
      {
        name: 'text-embedding',
        queueName: 'text-embedding',
        data: job.data,
        opts: {
          removeOnComplete: false,
          removeOnFail: false,
        },
      },
      {
        name: 'audio-embedding',
        queueName: 'audio-embedding',
        data: job.data,
        opts: {
          removeOnComplete: false,
          removeOnFail: false,
        },
      },
      {
        name: 'visual-embedding',
        queueName: 'visual-embedding',
        data: job.data,
        opts: {
          removeOnComplete: false,
          removeOnFail: false,
        },
      },
    ],
  })
})
