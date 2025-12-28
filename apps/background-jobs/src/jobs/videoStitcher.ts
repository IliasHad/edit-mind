import { generateCompilationResponse } from '@ai/services/modelRouter'
import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { stitchVideos } from '@media-utils/utils/stitcher'
import { getVideoWithScenesBySceneIds } from '@vector/services/vectorDb'
import { ChatMessageModel } from '@db/index'
import { VideoStitcherJobData } from '@media-utils/types/stitcher'
import { logger } from '@shared/services/logger'

async function processVideoStitcherJob(job: Job<VideoStitcherJobData>) {
  const { selectedSceneIds, messageId, chatId } = job.data
  logger.info({ jobId: job.id, messageId, chatId }, 'Starting video stitcher job')

  try {
    await ChatMessageModel.update(messageId, {
      stage: 'stitching',
    })

    const outputScenes = await getVideoWithScenesBySceneIds(selectedSceneIds)
    if (!outputScenes || outputScenes.length === 0) {
      throw new Error('No scenes found for the provided IDs')
    }

    const stitchedVideoPath = await stitchVideos(outputScenes, `${messageId}-${new Date().getTime()}.mp4`)
    const lastUserMessage = await ChatMessageModel.findFirst({
      where: {
        chatId: chatId,
        sender: 'user',
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    let text = 'Here’s your stitched video!'

    if (lastUserMessage && lastUserMessage?.text) {
      text = (await generateCompilationResponse(lastUserMessage?.text, outputScenes.length)).data
    }

    await ChatMessageModel.create({
      chatId: chatId,
      sender: 'assistant',
      text: text || 'Here’s your stitched video!',
      stitchedVideoPath,
      intent: 'compilation',
    })
    logger.info({ jobId: job.id, messageId, chatId }, 'Video stitcher job completed')
  } catch (error) {
    logger.error({ jobId: job.id, error }, 'Video stitcher job failed')
    await ChatMessageModel.create({
      chatId: chatId,
      sender: 'assistant',
      text: 'Sorry, there was an error creating your stitched video.',
      intent: 'compilation',
    })
    throw error
  }
}

export const videoStitcherWorker = new Worker('video-stitcher', processVideoStitcherJob, {
  connection,
  concurrency: 1,
})

videoStitcherWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Video stitcher job completed')
})

videoStitcherWorker.on('failed', (job, err) => {
  logger.error(
    {
      jobId: job?.id,
      error: err.message,
      stack: err.stack,
    },
    'Video stitcher job failed'
  )
})
