import { Ollama } from 'ollama'
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
import { YearInReviewDataSchema } from '@shared/schemas/yearInReview'
import type { VideoWithScenes } from '@shared/types/video'
import type { YearStats } from '@shared/types/stats'
import { getVideoAnalytics } from '@shared/utils/analytics'
import { ModelResponse } from '@ai/types/ai'
import { logger } from '@shared/services/logger'
import { VideoSearchParams } from '@shared/types/search'
import { OLLAMA_HOST, OLLAMA_MODEL, OLLAMA_PORT } from '@ai/constants'

class OllamaLLM {
  private client: Ollama | null = null
  private modelName: string
  private initPromise: Promise<void> | null = null

  constructor(modelName: string) {
    this.modelName = modelName
  }

  private async init() {
    if (this.initPromise) return this.initPromise
    if (this.client) {
      return
    }

    this.initPromise = (async () => {
      this.client = new Ollama({ host: `${OLLAMA_HOST}:${OLLAMA_PORT}` })
      await this.client.pull({
        model: this.modelName.toString(),
        stream: true,
      })
    })()

    await this.initPromise
    this.initPromise = null
  }

  private async generate(prompt: string, _maxTokens = 512): Promise<ModelResponse<string>> {
    await this.init()
    if (!this.client) throw new Error('Ollama client not initialized')
    try {
      const res = await this.client.generate({
        prompt,
        model: this.modelName,
      })
      const output = res.response?.trim() ?? ''
      const tokens =
        res.logprobs && res.logprobs[0] && res.logprobs[0].top_logprobs ? res.logprobs[0].top_logprobs[0].token : '0'
      return { data: output, tokens: parseInt(tokens), error: undefined }
    } catch (err) {
      logger.error('Ollama generation failed: ' + err)
      throw err
    }
  }

  async generateActionFromPrompt(
    query: string,
    chatHistory?: ChatMessage[],
    projectInstructions?: string
  ): Promise<ModelResponse<VideoSearchParams>> {
    const fallback = VideoSearchParamsSchema.parse({})

    if (!query || query.trim() === '') return { data: fallback, tokens: 0, error: undefined }

    const history = chatHistory?.length ? chatHistory.map((h) => `${h.sender}: ${h.text}`).join('\n') : ''

    const { data: raw, tokens, error } = await this.generate(SEARCH_PROMPT(query, history, projectInstructions), 1024)

    if (error || !raw) throw new Error('Error processing your ollama request')
    try {
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
      return {
        data: VideoSearchParamsSchema.parse(parsed),
        tokens,
        error: undefined,
      }
    } catch (parseError) {
      logger.error('Failed to parse JSON:' + parseError)
      throw parseError
    }
  }

  async generateAssistantMessage(
    userPrompt: string,
    count: number,
    chatHistory?: ChatMessage[],
    projectInstructions?: string
  ): Promise<ModelResponse<string>> {
    const history = chatHistory?.length ? chatHistory.map((h) => `${h.sender}: ${h.text}`).join('\n') : ''

    return this.generate(ASSISTANT_MESSAGE_PROMPT(userPrompt, count, history, projectInstructions))
  }

  async generateCompilationResponse(
    userPrompt: string,
    count: number,
    chatHistory?: ChatMessage[],
    projectInstructions?: string
  ): Promise<ModelResponse<string>> {
    const history = chatHistory?.length ? chatHistory.map((h) => `${h.sender}: ${h.text}`).join('\n') : ''

    return this.generate(VIDEO_COMPILATION_MESSAGE_PROMPT(userPrompt, count, history, projectInstructions))
  }

  async generateYearInReviewResponse(
    stats: YearStats,
    videos: VideoWithScenes[],
    extraDetails: string,
    projectInstructions?: string
  ): Promise<ModelResponse<any>> {
    try {
      let prompt = YEAR_IN_REVIEW(stats, videos, extraDetails, projectInstructions)
      let estimatedTokens = Math.ceil(prompt.length / 4)

      while (estimatedTokens > 2048 && videos.length > 1) {
        videos = videos.slice(0, Math.floor(videos.length / 2))
        prompt = YEAR_IN_REVIEW(stats, videos, extraDetails)
        estimatedTokens = Math.ceil(prompt.length / 4)
        logger.warn(`Prompt too long, truncating videos to ${videos.length} items`)
      }

      if (estimatedTokens > 2048) {
        logger.error('Prompt too long even after truncation')

        throw new Error('Prompt too long even after truncation')
      }

      const { data: raw, tokens, error } = await this.generate(prompt, 2048)
      if (error || !raw) return { data: null, tokens: 0, error }
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())

      const validated = YearInReviewDataSchema.parse(parsed)
      return { data: validated, tokens, error: undefined }
    } catch (err) {
      logger.error('Unexpected error in generateYearInReviewResponse: ' + err)
      throw err
    }
  }

  async generateGeneralResponse(
    prompt: string,
    history?: ChatMessage[],
    projectInstructions?: string
  ): Promise<ModelResponse<string>> {
    const context = history?.length ? history.map((h) => `${h.sender}: ${h.text}`).join('\n') : ''

    return this.generate(GENERAL_RESPONSE_PROMPT(prompt, context, projectInstructions))
  }

  async classifyIntent(
    prompt: string,
    chatHistory?: ChatMessage[],
    projectInstructions?: string
  ): Promise<ModelResponse<{ type?: 'general' | 'compilation' | 'analytics'; needsVideoData?: boolean }>> {
    const history = chatHistory?.length ? chatHistory.map((h) => `${h.sender}: ${h.text}`).join('\n') : ''

    const {
      data: raw,
      tokens,
      error,
    } = await this.generate(CLASSIFY_INTENT_PROMPT(prompt, history, projectInstructions))

    if (error || !raw) return { data: { type: 'general', needsVideoData: false }, tokens: 0, error }

    try {
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())

      return { data: parsed, tokens, error: undefined }
    } catch {
      throw new Error("Failed to parse intent'")
    }
  }

  async generateAnalyticsResponse(
    prompt: string,
    analytics: Awaited<ReturnType<typeof getVideoAnalytics>>,
    chatHistory?: ChatMessage[],
    projectInstructions?: string
  ): Promise<ModelResponse<string>> {
    const history = chatHistory?.length ? chatHistory.map((h) => `${h.sender}: ${h.text}`).join('\n') : ''

    return this.generate(ANALYTICS_RESPONSE_PROMPT(prompt, analytics, history, projectInstructions))
  }
}

export const OllamaModel = new OllamaLLM(OLLAMA_MODEL)
