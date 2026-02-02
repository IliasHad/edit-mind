import {
  GenerateContentResult,
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  GenerativeModel,
} from '@google/generative-ai'
import { GEMINI_API_KEY, GEMINI_MODEL_NAME } from '@ai/constants'
import {
  GENERAL_RESPONSE_PROMPT,
  ANALYTICS_RESPONSE_PROMPT,
  ASSISTANT_MESSAGE_PROMPT,
  CLASSIFY_INTENT_PROMPT,
  VIDEO_COMPILATION_MESSAGE_PROMPT,
  SEARCH_PROMPT,
  YEAR_IN_REVIEW,
} from '@ai/constants/prompts'
import type { ChatMessage } from '@prisma/client'
import type { VideoSearchParams } from '@shared/types/search'
import { logger } from '@shared/services/logger'
import { YearStats } from '@shared/types/stats'
import { YearInReviewData, YearInReviewDataSchema } from '@shared/schemas/yearInReview'
import { VideoWithScenes } from '@shared/types/video'
import { VideoSearchParamsSchema } from '@shared/schemas/search'
import { ModelResponse } from '@ai/types/ai'
import { formatHistory } from '@ai/utils'
import { VideoAnalytics } from '@shared/types/analytics'

const CONTEXT_WINDOW_LIMIT = 2_000_000

let model: GenerativeModel
if (GEMINI_API_KEY) {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
  model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME })
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
  }
}

export const GeminiModel = {
  async generateActionFromPrompt(
    query: string,
    chatHistory?: ChatMessage[],
    projectInstructions?: string
  ): Promise<ModelResponse<VideoSearchParams>> {
    const fallback: VideoSearchParams = VideoSearchParamsSchema.parse({})

    try {
      const history = formatHistory(chatHistory)
      const prompt = SEARCH_PROMPT(query, history, projectInstructions)

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
            semanticQuery: null,
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
      throw err
    }
  },

  async generateAssistantMessage(
    userPrompt: string,
    count: number,
    chatHistory?: ChatMessage[],
    projectInstructions?: string
  ): Promise<ModelResponse<string>> {
    try {
      const history = chatHistory?.length ? chatHistory.map((h) => `${h.sender}: ${h.text}`).join('\n') : ''

      const res = await generateAndCountTokens(
        ASSISTANT_MESSAGE_PROMPT(userPrompt, count, history, projectInstructions)
      )
      return res
    } catch (error) {
      logger.error('Gemini generateAssistantMessage error: ' + error)
      throw error
    }
  },
  async generateYearInReviewResponse(
    stats: YearStats,
    videos: VideoWithScenes[],
    extraDetails: string,
    projectInstructions: string
  ): Promise<ModelResponse<YearInReviewData | null>> {
    try {
      const content = YEAR_IN_REVIEW(stats, videos, extraDetails, projectInstructions)
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
      throw err
    }
  },

  async generateGeneralResponse(
    userPrompt: string,
    chatHistory?: ChatMessage[],
    projectInstructions?: string
  ): Promise<ModelResponse<string>> {
    const history = formatHistory(chatHistory)

    try {
      const res = await generateAndCountTokens(GENERAL_RESPONSE_PROMPT(userPrompt, history, projectInstructions))
      return res
    } catch (err) {
      logger.error('Gemini general response error:' + err)
      throw err
    }
  },

  async classifyIntent(
    prompt: string,
    chatHistory?: ChatMessage[],
    projectInstructions?: string
  ): Promise<
    ModelResponse<{ type?: 'general' | 'compilation' | 'analytics' | undefined; needsVideoData?: boolean | undefined }>
  > {
    try {
      const history = formatHistory(chatHistory)
      const content = CLASSIFY_INTENT_PROMPT(prompt, history, projectInstructions)
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
      throw error

    }
  },
  async generateCompilationResponse(
    userPrompt: string,
    count: number,
    chatHistory?: ChatMessage[],
    projectInstructions?: string
  ): Promise<ModelResponse<string>> {
    try {
      const history = formatHistory(chatHistory)
      const res = await generateAndCountTokens(
        VIDEO_COMPILATION_MESSAGE_PROMPT(userPrompt, count, history, projectInstructions)
      )
      return res
    } catch (error) {
      logger.error('Gemini analytics error: ' + error)
      throw error
    }
  },
  async generateAnalyticsResponse(
    userPrompt: string,
    analytics: VideoAnalytics,
    chatHistory?: ChatMessage[],
    projectInstructions?: string
  ): Promise<ModelResponse<string>> {
    try {
      const history = formatHistory(chatHistory)
      const res = await generateAndCountTokens(
        ANALYTICS_RESPONSE_PROMPT(userPrompt, analytics, history, projectInstructions)
      )
      return res
    } catch (error) {
      logger.error('Gemini analytics error: ' + error)
      throw error
    }
  },
}
