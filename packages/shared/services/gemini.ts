import { GenerateContentResult, GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import { GEMINI_API_KEY, GEMINI_MODEL_NAME } from '../constants'
import {
  GENERAL_RESPONSE_PROMPT,
  ANALYTICS_RESPONSE_PROMPT,
  ASSISTANT_MESSAGE_PROMPT,
  CLASSIFY_INTENT_PROMPT,
  VIDEO_COMPILATION_MESSAGE_PROMPT,
  SEARCH_PROMPT,
  YEAR_IN_REVIEW,
} from '../constants/prompts'
import type { ChatMessage } from '@prisma/client'
import type { VideoSearchParams } from '../types/search'
import { logger } from './logger'
import { getVideoAnalytics } from '@shared/utils/analytics'
import { YearStats } from '@shared/types/stats'
import { YearInReviewData, YearInReviewDataSchema } from '@shared/schemas/yearInReview'
import { VideoWithScenes } from '@shared/types/video'
import { VideoSearchParamsSchema } from '@shared/schemas/search'

const CONTEXT_WINDOW_LIMIT = 20000 // based on gemini-2.5-pro

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME })

const formatHistory = (chatHistory?: ChatMessage[]) => {
  return chatHistory?.length
    ? `Recent conversation:\n${chatHistory
        .slice(-10)
        .map((m) => `${m.sender}: ${m.text}`)
        .join('\n')}`
    : ''
}

export type ModelResponse<T> = {
  data: T
  error?: string
  tokens: number
}

const generateAndCountTokens = async (prompt: string): Promise<ModelResponse<string>> => {
  const { totalTokens } = await model.countTokens(prompt)

  if (totalTokens > CONTEXT_WINDOW_LIMIT) {
    throw new Error('Conversation is too long, please start a new one.')
  }

  const result: GenerateContentResult = await model.generateContent(prompt)

  return {
    data: result.response.text().trim(),
    tokens: totalTokens,
    error: undefined,
  }
}

export const GeminiModel = {
  async generateActionFromPrompt(
    query: string,
    chatHistory?: ChatMessage[]
  ): Promise<ModelResponse<VideoSearchParams>> {
    const fallback: VideoSearchParams = {
      action: null,
      emotions: [],
      objects: [],
      duration: null,
      shot_type: null,
      aspect_ratio: '16:9',
      transcriptionQuery: null,
      description: query || 'No query provided',
      faces: [],
      semanticQuery: query,
      locations: [],
      camera: null,
      detectedText: null,
    }

    try {
      const history = formatHistory(chatHistory)
      const prompt = SEARCH_PROMPT(query, history)

      const { totalTokens } = await model.countTokens(prompt)

      if (totalTokens > CONTEXT_WINDOW_LIMIT) {
        throw new Error('Conversation is too long, please start a new one.')
      }

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
        ],
      })
      const json = result.response
        .text()
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim()

      try {
        const parsed = JSON.parse(json)
        return {
          data: VideoSearchParamsSchema.parse({
            ...parsed,
            semanticQuery: query,
            locations: [],
            camera: null,
            detectedText: null,
          }),
          tokens: totalTokens,
          error: undefined,
        }
      } catch (parseError) {
        logger.error('Failed to parse JSON:' + parseError)
        return { data: fallback, tokens: 0, error: 'Invalid JSON' }
      }
    } catch (err) {
      logger.error('Gemini generateActionFromPrompt failed: ' + err)
      const error = err instanceof Error ? err.message : 'Unknown error'

      return {
        data: fallback,
        error,
        tokens: 0,
      }
    }
  },

  async generateAssistantMessage(userPrompt: string, resultsCount: number): Promise<ModelResponse<string>> {
    try {
      const res = await generateAndCountTokens(ASSISTANT_MESSAGE_PROMPT(userPrompt, resultsCount))
      return res
    } catch (error) {
      logger.error('Gemini generateAssistantMessage error: ' + error)
      const err = error instanceof Error ? error.message : 'Unknown error'
      return {
        data: '',
        error: err,
        tokens: 0,
      }
    }
  },
  async generateYearInReviewResponse(
    stats: YearStats,
    videos: VideoWithScenes[],
    extraDetails: string
  ): Promise<ModelResponse<YearInReviewData | null>> {
    try {
      const content = YEAR_IN_REVIEW(stats, videos, extraDetails)
      const { totalTokens } = await model.countTokens(content)

      if (totalTokens > CONTEXT_WINDOW_LIMIT) {
        throw new Error('Conversation is too long, please start a new one.')
      }

      const result = await model.generateContent(content)
      const text = result.response
        .text()
        .replace(/```json|```/g, '')
        .trim()

      try {
        const parsed = JSON.parse(text)
        const validated = YearInReviewDataSchema.parse(parsed)
        return { data: validated, tokens: totalTokens, error: undefined }
      } catch (parseError) {
        logger.error('Failed to parse year in review JSON: ' + parseError)
        return { data: null, tokens: 0, error: 'Invalid JSON response from AI' }
      }
    } catch (err) {
      logger.error('Gemini general response error:' + err)
      const error = err instanceof Error ? err.message : 'Unknown error'
      return {
        data: null,
        error,
        tokens: 0,
      }
    }
  },

  async generateGeneralResponse(userPrompt: string, chatHistory?: ChatMessage[]): Promise<ModelResponse<string>> {
    const history = formatHistory(chatHistory)

    try {
      const res = await generateAndCountTokens(GENERAL_RESPONSE_PROMPT(userPrompt, history))
      return res
    } catch (err) {
      logger.error('Gemini general response error:' + err)
      const error = err instanceof Error ? err.message : 'Unknown error'
      return {
        data: '',
        error,
        tokens: 0,
      }
    }
  },

  async classifyIntent(prompt: string, chatHistory?: ChatMessage[]): Promise<ModelResponse<any>> {
    try {
      const history = formatHistory(chatHistory)
      const content = CLASSIFY_INTENT_PROMPT(prompt, history)
      const { totalTokens } = await model.countTokens(content)

      if (totalTokens > CONTEXT_WINDOW_LIMIT) {
        throw new Error('Conversation is too long, please start a new one.')
      }

      const result = await model.generateContent(content)
      const text = result.response
        .text()
        .replace(/```json|```/g, '')
        .trim()
      return {
        data: JSON.parse(text),
        tokens: totalTokens,
        error: undefined,
      }
    } catch (error) {
      logger.error('Gemini classifyIntent error: ' + error)
      const err = error instanceof Error ? error.message : 'Unknown error'
      return {
        data: null,
        error: err,
        tokens: 0,
      }
    }
  },
  async generateCompilationResponse(
    userPrompt: string,
    count: number,
    chatHistory?: ChatMessage[]
  ): Promise<ModelResponse<string>> {
    try {
      const history = formatHistory(chatHistory)
      const res = await generateAndCountTokens(VIDEO_COMPILATION_MESSAGE_PROMPT(userPrompt, count, history))
      return res
    } catch (error) {
      logger.error('Gemini analytics error: ' + error)
      const err = error instanceof Error ? error.message : 'Unknown error'
      return { data: '', error: err, tokens: 0 }
    }
  },
  async generateAnalyticsResponse(
    userPrompt: string,
    analytics: Awaited<ReturnType<typeof getVideoAnalytics>>,
    chatHistory?: ChatMessage[]
  ): Promise<ModelResponse<string>> {
    try {
      const history = formatHistory(chatHistory)
      const res = await generateAndCountTokens(ANALYTICS_RESPONSE_PROMPT(userPrompt, analytics, history))
      return res
    } catch (error) {
      logger.error('Gemini analytics error: ' + error)
      const err = error instanceof Error ? error.message : 'Unknown error'
      return {
        data: '',
        error: err,
        tokens: 0,
      }
    }
  },
}
