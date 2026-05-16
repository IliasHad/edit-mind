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
  buildPromptInstructions,
} from '../constants/prompts'
import { VideoSearchParamsSchema } from '@shared/schemas/search'
import { YearInReviewData, YearInReviewDataSchema } from '@shared/schemas/yearInReview'
import type { VideoWithScenes } from '@shared/types/video'
import type { YearStats } from '@shared/types/stats'
import { ModelResponse, type AIRequestOptions } from '@ai/types/ai'
import { logger } from '@shared/services/logger'
import { VideoSearchParams } from '@shared/types/search'
import { OLLAMA_HOST, OLLAMA_MODEL, OLLAMA_PORT } from '@ai/constants'
import { VideoAnalytics } from '@shared/types/analytics'

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

  private async generate(prompt: string, _maxTokens = 512, timeoutMs = 60_000): Promise<ModelResponse<string>> {
    await this.init()
    if (!this.client) throw new Error('Ollama client not initialized')

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Ollama generate timed out after ${timeoutMs}ms`)), timeoutMs)
    )

    try {
      const res = await Promise.race([
        this.client.generate({ prompt, model: this.modelName }),
        timeout,
      ])
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
    options?: AIRequestOptions
  ): Promise<ModelResponse<VideoSearchParams>> {
    const fallback = VideoSearchParamsSchema.parse({})

    if (!query || query.trim() === '') return { data: fallback, tokens: 0, error: undefined }

    const history = chatHistory?.length ? chatHistory.map((h) => `${h.sender}: ${h.text}`).join('\n') : ''

    const { data: raw, tokens, error } = await this.generate(SEARCH_PROMPT(query, history, buildPromptInstructions(options)), 1024)

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
    options?: AIRequestOptions
  ): Promise<ModelResponse<string>> {
    const history = chatHistory?.length ? chatHistory.map((h) => `${h.sender}: ${h.text}`).join('\n') : ''

    return this.generate(ASSISTANT_MESSAGE_PROMPT(userPrompt, count, history, buildPromptInstructions(options)))
  }

  async generateCompilationResponse(
    userPrompt: string,
    count: number,
    chatHistory?: ChatMessage[],
    options?: AIRequestOptions
  ): Promise<ModelResponse<string>> {
    const history = chatHistory?.length ? chatHistory.map((h) => `${h.sender}: ${h.text}`).join('\n') : ''

    return this.generate(VIDEO_COMPILATION_MESSAGE_PROMPT(userPrompt, count, history, buildPromptInstructions(options)))
  }

  async generateYearInReviewResponse(
    stats: YearStats,
    videos: VideoWithScenes[],
    extraDetails: string,
    options?: AIRequestOptions
  ): Promise<ModelResponse<YearInReviewData | null>> {
    try {
      let prompt = YEAR_IN_REVIEW(stats, videos, extraDetails, buildPromptInstructions(options))
      let estimatedTokens = Math.ceil(prompt.length / 4)

      while (estimatedTokens > 2048 && videos.length > 1) {
        videos = videos.slice(0, Math.floor(videos.length / 2))
        prompt = YEAR_IN_REVIEW(stats, videos, extraDetails, buildPromptInstructions(options))
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
    options?: AIRequestOptions
  ): Promise<ModelResponse<string>> {
    const context = history?.length ? history.map((h) => `${h.sender}: ${h.text}`).join('\n') : ''

    return this.generate(GENERAL_RESPONSE_PROMPT(prompt, context, buildPromptInstructions(options)))
  }

  async classifyIntent(
    prompt: string,
    chatHistory?: ChatMessage[],
    options?: AIRequestOptions
  ): Promise<ModelResponse<{ type?: 'general' | 'compilation' | 'analytics'; needsVideoData?: boolean }>> {
    const history = chatHistory?.length ? chatHistory.map((h) => `${h.sender}: ${h.text}`).join('\n') : ''

    const {
      data: raw,
      tokens,
      error,
    } = await this.generate(CLASSIFY_INTENT_PROMPT(prompt, history, buildPromptInstructions(options)))

    if (error || !raw) return { data: { type: 'general', needsVideoData: false }, tokens: 0, error }

    try {
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())

      return { data: parsed, tokens, error: undefined }
    } catch {
      logger.warn('Failed to parse intent classification JSON, falling back to general')
      return { data: { type: 'general', needsVideoData: false }, tokens, error: undefined }
    }
  }

  async generateAnalyticsResponse(
    prompt: string,
    analytics: VideoAnalytics,
    chatHistory?: ChatMessage[],
    options?: AIRequestOptions
  ): Promise<ModelResponse<string>> {
    const history = chatHistory?.length ? chatHistory.map((h) => `${h.sender}: ${h.text}`).join('\n') : ''

    return this.generate(ANALYTICS_RESPONSE_PROMPT(prompt, analytics, history, buildPromptInstructions(options)))
  }
}

export const OllamaModel = new OllamaLLM(OLLAMA_MODEL)
