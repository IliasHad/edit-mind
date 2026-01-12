import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { logger } from '@shared/services/logger'
import {
  classifyIntent,
  generateActionFromPrompt,
  generateAnalyticsResponse,
  generateCompilationResponse,
  generateGeneralResponse,
} from '@ai/services/modelRouter'
import { getSimilarScenes, searchScenes } from '@search/services'
import { ChatMessageModel, ChatModel, ProjectModel } from '@db/index'
import { getVideoAnalytics } from '@shared/utils/analytics'
import { getAllVideos } from '@vector/services/vectorDb'

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
    let assistantText: string
    let outputSceneIds: string[] = []
    let tokensUsed = intentResult.tokens

    await ChatMessageModel.update(newMessage.id, {
      intent: intent.type,
    })

    if (intent.type) {
      await job.log(intent.type?.toString())
    }

    try {
      switch (intent.type) {
        case 'similarity': {
          const lastAssistantMessage = recentMessages.find(
            (m) => m.sender === 'assistant' && m.outputSceneIds?.length > 0
          )

          if (!lastAssistantMessage?.outputSceneIds?.[0]) {
            assistantText = "I don't have a previous scene to compare to. Could you search for a scene first?"
            break
          }

          const referenceSceneIds = lastAssistantMessage.outputSceneIds

          // Pass projectVideos here
          const results = await getSimilarScenes(referenceSceneIds, referenceSceneIds.length, projectVideos)

          outputSceneIds = results.map((scene) => scene.id)
          const response = await generateCompilationResponse(prompt, outputSceneIds.length, recentMessages)
          assistantText = response.data || 'Sorry, I could not generate a response.'
          tokensUsed += response.tokens
          break
        }
        case 'analytics': {
          await ChatMessageModel.update(newMessage.id, {
            stage: 'analyzing',
          })
          const videosWithScenes = await getAllVideos()
          const analytics = await getVideoAnalytics(videosWithScenes)
          const response = await generateAnalyticsResponse(prompt, analytics, recentMessages)
          assistantText = response.data || 'Sorry, I could not generate an analytics response.'
          tokensUsed += response.tokens
          break
        }
        case 'refinement': {
          const { data: searchParams, tokens, error } = await generateActionFromPrompt(prompt, recentMessages)
          tokensUsed += tokens

          if (error || !searchParams) {
            assistantText = 'Sorry, I could not understand your request.'
            break
          }
          await ChatMessageModel.update(newMessage.id, {
            stage: 'searching',
          })

          const results = await searchScenes(searchParams, searchParams.limit, true, projectVideos)

          await ChatMessageModel.update(newMessage.id, {
            stage: 'refining',
          })

          if (intent.keepPrevious) {
            const lastAssistantMessage = recentMessages.find(
              (m) => m.sender === 'assistant' && m.outputSceneIds?.length > 0
            )
            if (lastAssistantMessage?.outputSceneIds) {
              // New scenes first, then previous ones
              const newSceneIds = results.flatMap((result) => result.scenes).map((scene) => scene.id)
              const previousSceneIds = lastAssistantMessage.outputSceneIds.filter(Boolean)

              // Combine and remove duplicates while preserving order
              outputSceneIds = [...newSceneIds, ...previousSceneIds.filter((id) => !newSceneIds.includes(id))]
            } else {
              outputSceneIds = results.flatMap((result) => result.scenes).map((scene) => scene.id)
            }
          } else {
            outputSceneIds = results.flatMap((result) => result.scenes).map((scene) => scene.id)
          }
          const response = await generateCompilationResponse(prompt, outputSceneIds.length, recentMessages)
          assistantText = response.data || 'Sorry, I could not generate a compilation response.'
          tokensUsed += response.tokens
          break
        }
        case 'compilation': {
          const { data: searchParams, tokens, error } = await generateActionFromPrompt(prompt, recentMessages)
          tokensUsed += tokens

          if (error || !searchParams) {
            assistantText = 'Sorry, I could not understand your request.'
            break
          }
          await ChatMessageModel.update(newMessage.id, {
            stage: 'searching',
          })

          const results = await searchScenes(searchParams, searchParams.limit, true, projectVideos)

          outputSceneIds = results.flatMap((result) => result.scenes).map((scene) => scene.id)
          const response = await generateCompilationResponse(prompt, outputSceneIds.length, recentMessages)
          assistantText = response.data || 'Sorry, I could not generate a compilation response.'
          tokensUsed += response.tokens
          break
        }

        case 'general':
        default: {
          const response = await generateGeneralResponse(prompt, recentMessages)
          assistantText = response.data || 'Sorry, I could not generate a response.'
          tokensUsed += response.tokens
          break
        }
      }

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
