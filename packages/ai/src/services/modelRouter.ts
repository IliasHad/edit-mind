import { LocalModel } from '@ai/services/localLlm'
import { GeminiModel } from '@ai/services/gemini'
import { logger } from '@shared/services/logger'
import path from 'path'
import { GEMINI_API_KEY, GEMINI_MODEL_NAME, SEARCH_AI_MODEL, USE_LOCAL } from '@ai/constants'
import { AIModel } from '@ai/types/ai'
import type { ChatMessage } from '@prisma/client'
import { YearStats } from '@shared/types/stats'
import { VideoWithScenes } from '@shared/types/video'

let activeModel: AIModel

if (USE_LOCAL && SEARCH_AI_MODEL) {
  logger.debug(`Using Local Model: ${path.basename(SEARCH_AI_MODEL)}`)
  activeModel = LocalModel
} else if (GEMINI_API_KEY) {
  logger.debug(`Using Gemini Model: ${GEMINI_MODEL_NAME}`)
  activeModel = GeminiModel
} else {
  throw new Error('No valid AI backend found. Set USE_LOCAL + SEARCH_AI_MODEL or GEMINI_API_KEY.')
}

async function runWithLogging<T>(fn: () => Promise<T>, query: string): Promise<T> {
  try {
    const result = await fn()
    return result
  } catch (err) {
    logger.error(`Error processing query "${query}": ${err}`)
    throw err
  }
}

export const generateActionFromPrompt = async (query: string, chatHistory?: ChatMessage[]) =>
  runWithLogging(() => activeModel.generateActionFromPrompt(query, chatHistory), query)

export const generateAssistantMessage = async (userPrompt: string, resultsCount: number) =>
  runWithLogging(() => activeModel.generateAssistantMessage(userPrompt, resultsCount), userPrompt)

export const generateCompilationResponse = async (
  userPrompt: string,
  resultsCount: number,
  chatHistory?: ChatMessage[]
) => runWithLogging(() => activeModel.generateCompilationResponse(userPrompt, resultsCount, chatHistory), userPrompt)

export const generateGeneralResponse = async (userPrompt: string, chatHistory?: ChatMessage[]) =>
  runWithLogging(() => activeModel.generateGeneralResponse(userPrompt, chatHistory), userPrompt)

export const classifyIntent = async (prompt: string, chatHistory?: ChatMessage[]) =>
  runWithLogging(() => activeModel.classifyIntent(prompt, chatHistory), prompt)

export const generateAnalyticsResponse = async (userPrompt: string, analytics: any, chatHistory?: ChatMessage[]) =>
  runWithLogging(() => activeModel.generateAnalyticsResponse(userPrompt, analytics, chatHistory), userPrompt)

export const cleanup = async () => {
  if (activeModel.cleanUp) {
    await activeModel.cleanUp()
  }
}

export const generateYearInReviewResponse = async (stats: YearStats, videos: VideoWithScenes[], extraDetails: string) =>
  runWithLogging(() => activeModel.generateYearInReviewResponse(stats, videos, extraDetails), extraDetails)
