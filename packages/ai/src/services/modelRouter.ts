import { GeminiModel } from '@ai/services/gemini'
import { OllamaModel } from '@ai/services/ollama'
import { logger } from '@shared/services/logger'
import {
  GEMINI_API_KEY,
  GEMINI_MODEL_NAME,
  OLLAMA_MODEL,
  USE_GEMINI,
  USE_OLLAMA_MODEL,
} from '@ai/constants'
import { AIModel } from '@ai/types/ai'
import type { ChatMessage } from '@prisma/client'
import { YearStats } from '@shared/types/stats'
import { VideoWithScenes } from '@shared/types/video'
import { VideoAnalytics } from '@shared/types/analytics'

let activeModel: AIModel

const setupModel = () => {
  if (USE_OLLAMA_MODEL && OLLAMA_MODEL) {
    logger.debug(`Using Ollama Model: ${OLLAMA_MODEL}`)
    activeModel = OllamaModel
  } if (GEMINI_API_KEY && USE_GEMINI) {
    logger.debug(`Using Gemini Model: ${GEMINI_MODEL_NAME}`)
    activeModel = GeminiModel
  } else {
    throw new Error('No valid AI backend found. Set USE_OLLAMA_MODEL + OLLAMA_MODEL or GEMINI_API_KEY + USE_GEMINI.')
  }
}

async function runWithLogging<T>(fn: () => Promise<T>, query: string): Promise<T> {
  try {
    if (!activeModel) {
      setupModel()
    }
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

export const generateAnalyticsResponse = async (userPrompt: string, analytics: VideoAnalytics, chatHistory?: ChatMessage[]) =>
  runWithLogging(() => activeModel.generateAnalyticsResponse(userPrompt, analytics, chatHistory), userPrompt)

export const cleanup = async () => {
  if (activeModel && activeModel.cleanUp) {
    await activeModel.cleanUp()
  }
}

export const generateYearInReviewResponse = async (stats: YearStats, videos: VideoWithScenes[], extraDetails: string) =>
  runWithLogging(() => activeModel.generateYearInReviewResponse(stats, videos, extraDetails), extraDetails)
