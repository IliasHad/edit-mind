import { GeminiModel } from '@ai/services/gemini'
import { OllamaModel } from '@ai/services/ollama'
import { OpenaiLikeModel } from '@ai/services/openaiLike'
import { logger } from '@shared/services/logger'
import {
  GEMINI_API_KEY,
  GEMINI_MODEL_NAME,
  OLLAMA_MODEL,
  USE_GEMINI,
  USE_OLLAMA_MODEL,
  OPENAI_LIKE_BASE_URL,
  OPENAI_LIKE_MODEL,
} from '@ai/constants'
import { AIModel } from '@ai/types/ai'
import type { ChatMessage } from '@prisma/client'
import { YearStats } from '@shared/types/stats'
import { VideoWithScenes } from '@shared/types/video'
import { VideoAnalytics } from '@shared/types/analytics'

let activeModel: AIModel
let activeModelName: string | undefined

const setupModel = () => {
  if (OPENAI_LIKE_BASE_URL) {
    activeModelName = 'openai-like'
    logger.debug({ backend: activeModelName, model: OPENAI_LIKE_MODEL }, 'Using AI backend')
    activeModel = OpenaiLikeModel
  } else if (USE_OLLAMA_MODEL && OLLAMA_MODEL) {
    activeModelName = 'ollama'
    logger.debug({ backend: activeModelName, model: OLLAMA_MODEL }, 'Using AI backend')
    activeModel = OllamaModel
  } else if (GEMINI_API_KEY && USE_GEMINI) {
    activeModelName = 'gemini'
    logger.debug({ backend: activeModelName, model: GEMINI_MODEL_NAME }, 'Using AI backend')
    activeModel = GeminiModel
  } else {
    throw new Error('No valid AI backend found. Set OPENAI_LIKE_BASE_URL, or USE_OLLAMA_MODEL + OLLAMA_MODEL, or GEMINI_API_KEY + USE_GEMINI.')
  }
}

function isModelResponse(value: unknown): value is { data?: unknown; tokens?: number; error?: string } {
  return typeof value === 'object' && value !== null && ('data' in value || 'tokens' in value || 'error' in value)
}

async function runWithLogging<T>(operation: string, fn: () => Promise<T>, query: string): Promise<T> {
  const startedAt = Date.now()

  try {
    if (!activeModel) {
      setupModel()
    }

    logger.debug(
      { operation, backend: activeModelName, queryLength: query.length },
      'AI model operation started'
    )

    const result = await fn()
    const elapsedMs = Date.now() - startedAt

    if (isModelResponse(result)) {
      const hasData = Boolean(result.data)
      const details = {
        operation,
        backend: activeModelName,
        queryLength: query.length,
        elapsedMs,
        hasData,
        tokens: result.tokens ?? 0,
        responseError: result.error,
      }

      if (!hasData) {
        logger.warn(details, 'AI model returned no data')
      } else {
        logger.debug(details, 'AI model operation completed')
      }
    } else {
      logger.debug(
        { operation, backend: activeModelName, queryLength: query.length, elapsedMs },
        'AI model operation completed'
      )
    }

    return result
  } catch (err) {
    logger.error(
      { operation, backend: activeModelName, queryLength: query.length, error: err },
      'Error processing AI model operation'
    )
    throw err
  }
}

export const generateActionFromPrompt = async (query: string, chatHistory?: ChatMessage[]) =>
  runWithLogging('generateActionFromPrompt', () => activeModel.generateActionFromPrompt(query, chatHistory), query)

export const generateAssistantMessage = async (userPrompt: string, resultsCount: number) =>
  runWithLogging('generateAssistantMessage', () => activeModel.generateAssistantMessage(userPrompt, resultsCount), userPrompt)

export const generateCompilationResponse = async (
  userPrompt: string,
  resultsCount: number,
  chatHistory?: ChatMessage[]
) => runWithLogging('generateCompilationResponse', () => activeModel.generateCompilationResponse(userPrompt, resultsCount, chatHistory), userPrompt)

export const generateGeneralResponse = async (userPrompt: string, chatHistory?: ChatMessage[]) =>
  runWithLogging('generateGeneralResponse', () => activeModel.generateGeneralResponse(userPrompt, chatHistory), userPrompt)

export const classifyIntent = async (prompt: string, chatHistory?: ChatMessage[]) =>
  runWithLogging('classifyIntent', () => activeModel.classifyIntent(prompt, chatHistory), prompt)

export const generateAnalyticsResponse = async (userPrompt: string, analytics: VideoAnalytics, chatHistory?: ChatMessage[]) =>
  runWithLogging('generateAnalyticsResponse', () => activeModel.generateAnalyticsResponse(userPrompt, analytics, chatHistory), userPrompt)

export const cleanup = async () => {
  if (activeModel && activeModel.cleanUp) {
    await activeModel.cleanUp()
  }
}

export const generateYearInReviewResponse = async (stats: YearStats, videos: VideoWithScenes[], extraDetails: string) =>
  runWithLogging('generateYearInReviewResponse', () => activeModel.generateYearInReviewResponse(stats, videos, extraDetails), extraDetails)
