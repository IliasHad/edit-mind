import OpenAI from 'openai'
import type { ChatMessage } from '@prisma/client'
import {
  SEARCH_PROMPT,
  ASSISTANT_MESSAGE_PROMPT,
  VIDEO_COMPILATION_MESSAGE_PROMPT,
  YEAR_IN_REVIEW,
  GENERAL_RESPONSE_PROMPT,
  CLASSIFY_INTENT_PROMPT,
  ANALYTICS_RESPONSE_PROMPT,
} from '../constants/prompts'
import { VideoSearchParamsSchema } from '@shared/schemas/search'
import { YearInReviewData, YearInReviewDataSchema } from '@shared/schemas/yearInReview'
import type { VideoWithScenes } from '@shared/types/video'
import type { YearStats } from '@shared/types/stats'
import { ModelResponse } from '@ai/types/ai'
import { logger } from '@shared/services/logger'
import { VideoSearchParams } from '@shared/types/search'
import { MINIMAX_API_KEY, MINIMAX_MODEL } from '@ai/constants'
import { VideoAnalytics } from '@shared/types/analytics'
import { formatHistory } from '@ai/utils'

const CONTEXT_WINDOW_LIMIT = 1_000_000

let client: OpenAI | null = null

function getClient(): OpenAI {
  if (!client) {
    if (!MINIMAX_API_KEY) {
      throw new Error('MINIMAX_API_KEY is not set')
    }
    client = new OpenAI({
      apiKey: MINIMAX_API_KEY,
      baseURL: 'https://api.minimax.io/v1',
    })
  }
  return client
}

function stripThinkTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

async function generate(prompt: string): Promise<ModelResponse<string>> {
  const openai = getClient()

  const response = await openai.chat.completions.create({
    model: MINIMAX_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  })

  const content = response.choices[0]?.message?.content ?? ''
  const tokens = response.usage?.prompt_tokens ?? 0

  return {
    data: stripThinkTags(content).trim(),
    tokens,
  }
}

async function generateJSON(prompt: string): Promise<ModelResponse<string>> {
  const openai = getClient()

  const response = await openai.chat.completions.create({
    model: MINIMAX_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  })

  const content = response.choices[0]?.message?.content ?? ''
  const tokens = response.usage?.prompt_tokens ?? 0

  return {
    data: stripThinkTags(content)
      .replace(/```json|```/g, '')
      .trim(),
    tokens,
  }
}

export const MiniMaxModel = {
  async generateActionFromPrompt(
    query: string,
    chatHistory?: ChatMessage[],
    projectInstructions?: string
  ): Promise<ModelResponse<VideoSearchParams>> {
    const fallback = VideoSearchParamsSchema.parse({})

    if (!query || query.trim() === '') return { data: fallback, tokens: 0, error: undefined }

    try {
      const history = formatHistory(chatHistory)
      const prompt = SEARCH_PROMPT(query, history, projectInstructions)

      const { data: raw, tokens } = await generateJSON(prompt)

      try {
        const parsed = JSON.parse(raw)
        return {
          data: VideoSearchParamsSchema.parse({
            ...parsed,
            semanticQuery: null,
            locations: [],
            camera: null,
            detectedText: null,
          }),
          tokens,
          error: undefined,
        }
      } catch (parseError) {
        logger.error('Failed to parse JSON: ' + parseError)
        return { data: fallback, tokens: 0, error: 'Invalid JSON' }
      }
    } catch (err) {
      logger.error('MiniMax generateActionFromPrompt failed: ' + err)
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
      const history = chatHistory?.length
        ? chatHistory.map((h) => `${h.sender}: ${h.text}`).join('\n')
        : ''
      return await generate(ASSISTANT_MESSAGE_PROMPT(userPrompt, count, history, projectInstructions))
    } catch (error) {
      logger.error('MiniMax generateAssistantMessage error: ' + error)
      throw error
    }
  },

  async generateYearInReviewResponse(
    stats: YearStats,
    videos: VideoWithScenes[],
    extraDetails: string,
    projectInstructions?: string
  ): Promise<ModelResponse<YearInReviewData | null>> {
    try {
      const content = YEAR_IN_REVIEW(stats, videos, extraDetails, projectInstructions)
      const { data: raw, tokens } = await generateJSON(content)

      try {
        const parsed = JSON.parse(raw)
        const validated = YearInReviewDataSchema.parse(parsed)
        return { data: validated, tokens, error: undefined }
      } catch (parseError) {
        logger.error('Failed to parse year in review JSON: ' + parseError)
        return { data: null, tokens: 0, error: 'Invalid JSON response from AI' }
      }
    } catch (err) {
      logger.error('MiniMax year in review error: ' + err)
      throw err
    }
  },

  async generateGeneralResponse(
    userPrompt: string,
    chatHistory?: ChatMessage[],
    projectInstructions?: string
  ): Promise<ModelResponse<string>> {
    try {
      const history = formatHistory(chatHistory)
      return await generate(GENERAL_RESPONSE_PROMPT(userPrompt, history, projectInstructions))
    } catch (err) {
      logger.error('MiniMax general response error: ' + err)
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
      const { data: raw, tokens } = await generateJSON(content)

      return {
        data: JSON.parse(raw),
        tokens,
        error: undefined,
      }
    } catch (error) {
      logger.error('MiniMax classifyIntent error: ' + error)
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
      return await generate(VIDEO_COMPILATION_MESSAGE_PROMPT(userPrompt, count, history, projectInstructions))
    } catch (error) {
      logger.error('MiniMax compilation response error: ' + error)
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
      return await generate(ANALYTICS_RESPONSE_PROMPT(userPrompt, analytics, history, projectInstructions))
    } catch (error) {
      logger.error('MiniMax analytics response error: ' + error)
      throw error
    }
  },
}
