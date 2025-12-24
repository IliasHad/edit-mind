import { generateCompilationResponse } from '@shared/services/modelRouter'
import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { stitchVideos } from '@shared/utils/sticher'
import { getVideoWithScenesBySceneIds } from '@shared/services/vectorDb'
import { prisma } from '../services/db'
import { VideoStitcherJobData } from '@shared/types/stitcher'
import { logger } from '@shared/services/logger'

async function processVideoStitcherJob(job: Job<VideoStitcherJobData>) {
  const { selectedSceneIds, messageId, chatId } = job.data
  logger.info({ jobId: job.id, messageId, chatId }, 'Starting video stitcher job')

  try {
    const outputScenes = await getVideoWithScenesBySceneIds(selectedSceneIds)
    if (!outputScenes || outputScenes.length === 0) {
      throw new Error('No scenes found for the provided IDs')
    }

    const stitchedVideoPath = await stitchVideos(outputScenes, `${messageId}-${new Date().getTime()}.mp4`)
    const lastUserMessage = await prisma.chatMessage.findFirst({
      where: {
        chatId: chatId,
        sender: 'user',
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    let text = 'Here’s your stitched video!'

    if (lastUserMessage) {
      text = (await generateCompilationResponse(lastUserMessage?.text, outputScenes.length)).data
    }

    await prisma.chatMessage.create({
      data: {
        chatId: chatId,
        sender: 'assistant',
        text,
        stitchedVideoPath,
      },
    })
    logger.info({ jobId: job.id, messageId, chatId }, 'Video stitcher job completed')
  } catch (error) {
    logger.error({ jobId: job.id, error }, 'Video stitcher job failed')
    await prisma.chatMessage.create({
      data: {
        chatId: chatId,
        sender: 'assistant',
        text: 'Sorry, there was an error creating your stitched video.',
      },
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
