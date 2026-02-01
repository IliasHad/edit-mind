import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { logger } from '@shared/services/logger'
import { classifyIntent } from '@ai/services/modelRouter';
import { ChatMessageModel, ChatModel, ProjectModel } from '@db/index'
import { processIntent } from '@chat/services/processor'

interface ChatJobData {
  chatId: string
  prompt: string
  projectId?: string
}

async function processChatMessageJob(job: Job<ChatJobData>) {
  const { chatId, prompt } = job.data

  try {
    logger.info({ jobId: job.id, chatId: chatId }, 'Starting chat message job')

    const chat = await ChatModel.findById(chatId)

    if (!chat) {
      throw new Error('Chat not found')
    }

    let projectVideos: string[] | undefined = undefined
    if (chat.projectId) {
      const project = await ProjectModel.findByIdWithVideos(chat.projectId)
      projectVideos = project?.videos?.map((video) => video.source) ?? undefined

      logger.debug(`Using project videos: ${JSON.stringify(projectVideos, null, 2)}`)
    }

    const recentMessages = await ChatMessageModel.findManyByChatId(chat.id)
    let newMessage = recentMessages[0]

    if (recentMessages.length > 0 && recentMessages[0].stage !== 'understanding' && !recentMessages[0].isThinking) {
      newMessage = await ChatMessageModel.create({
        chatId: chat.id,
        sender: 'assistant',
        isThinking: true,
        text: '',
        stage: 'understanding',
      })
    }

    const intentResult = await classifyIntent(prompt, recentMessages)

    if (intentResult.error || !intentResult.data) {
      if (intentResult.error?.includes('Gemini API quotas')) {
        await ChatMessageModel.update(newMessage.id, {
          text: 'You exceed your Gemini API quotes, please try again in next couple of minutes',
          isError: true,
          isThinking: false,
        })
        return
      }
      await ChatMessageModel.update(newMessage.id, {
        text: 'Failed to classify intent.',
        isError: true,
        isThinking: false,
      })
      return
    }

    const intent = intentResult.data

    await ChatMessageModel.update(newMessage.id, {
      intent: intent.type,
    })

    if (intent.type) {
      await job.log(intent.type?.toString())
    }

    try {
      const { assistantText, outputSceneIds, tokensUsed } = await processIntent({
        intent,
        prompt,
        recentMessages,
        newMessage,
        projectVideos,
      })

      await ChatMessageModel.update(newMessage.id, {
        text: assistantText,
        outputSceneIds,
        tokensUsed: BigInt(tokensUsed),
        isThinking: false,
      })
    } catch (error) {
      logger.error(error)
      await ChatMessageModel.update(newMessage.id, {
        text: 'Failed to process your message.',
        isError: true,
        isThinking: false,
      })
    }
  } catch (error) {
    logger.error(error)
    throw error
  }
}

export const chatWorker = new Worker('chat-message', processChatMessageJob, {
  connection,
  concurrency: 1,
  lockDuration: 60 * 1000,
  stalledInterval: 15 * 1000,
  maxStalledCount: 3,
  lockRenewTime: 30 * 1000,
})
