import { generateCompilationResponse } from '@ai/services/modelRouter'
import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { stitchVideos } from '@media-utils/utils/stitcher'
import { getVideoWithScenesBySceneIds } from '@vector/services/db'
import { ChatMessageModel } from '@db/index'
import { VideoStitcherJobData } from '@media-utils/types/stitcher'
import { logger } from '@shared/services/logger'

async function processVideoStitcherJob(job: Job<VideoStitcherJobData>) {
  const { selectedSceneIds, messageId, chatId } = job.data
  logger.debug({ jobId: job.id, messageId, chatId }, 'Starting video stitcher job')

  try {
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
    let text = "Here's your stitched video!"

    if (lastUserMessage && lastUserMessage?.text) {
      const response = await generateCompilationResponse(lastUserMessage?.text, outputScenes.length)
      text = response.data
    }

    try {
      await ChatMessageModel.update(messageId, {
        stage: 'compiling',
        isThinking: false,
        stitchedVideoPath,
        text,
      })

    } catch (error) {
      logger.error({ error, messageId }, 'Failed to update chat message with stitched video path')
    }

    logger.debug({ jobId: job.id, messageId, chatId }, 'Video stitcher job completed')
  } catch (error) {
    logger.error({ error, messageId }, 'Video stitcher failed, deleting message')
    try {
      await ChatMessageModel.delete(messageId)
    } catch (deleteError) {
      logger.error({ deleteError, messageId }, 'Failed to delete message after stitch error')
    }
    throw error
  }
}

export const videoStitcherWorker = new Worker('video-stitcher', processVideoStitcherJob, {
  connection,
  concurrency: 1,
  lockDuration: 2 * 60 * 60 * 1000,
  lockRenewTime: 30 * 1000,
  stalledInterval: 30 * 1000,
  maxStalledCount: 1,
})
