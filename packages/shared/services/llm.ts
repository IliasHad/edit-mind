import type {
  Llama,
  LlamaModel,
  LlamaContext,
  LlamaGrammar,
} from 'node-llama-cpp'
import { SEARCH_AI_MODEL } from '../constants'
import {
  GENERAL_RESPONSE_PROMPT,
  ANALYTICS_RESPONSE_PROMPT,
  CLASSIFY_INTENT_PROMPT,
  VIDEO_COMPILATION_MESSAGE_PROMPT,
  YEAR_IN_REVIEW,
  SEARCH_PROMPT,
  ASSISTANT_MESSAGE_PROMPT,
} from '../constants/prompts'
import type { VideoSearchParams } from '../types/search'
import { VideoSearchParamsSchema } from '@shared/schemas/search'
import { getVideoAnalytics } from '@shared/utils/analytics'
import type { ChatMessage } from '@prisma/client'
import { ModelResponse } from './gemini'
import { logger } from './logger'
import { YearStats } from '@shared/types/stats'
import { YearInReviewData, YearInReviewDataSchema } from '@shared/schemas/yearInReview'
import { VideoWithScenes } from '@shared/types/video'

class LocalLLM {
  private llama: Llama | null = null
  private model: LlamaModel | null = null
  private context: LlamaContext | null = null
  private initPromise: Promise<void> | null = null

  async init() {
    if (this.initPromise) {
      return this.initPromise
    }

    if (this.context) {
      return
    }

    this.initPromise = this._doInit()
    await this.initPromise
    this.initPromise = null
  }

  private async _doInit() {
    if (!SEARCH_AI_MODEL) {
      throw new Error('Local model enabled, but SEARCH_AI_MODEL is not set.')
    }

    if (!this.llama) {
      const loader = await import('node-llama-cpp')
      this.llama = await loader.getLlama()
    }

    if (!this.model) {
      this.model = await this.llama!.loadModel({ modelPath: SEARCH_AI_MODEL })
    }

    if (!this.context) {
      this.context = await this.model!.createContext({
        contextSize: 4096,
        sequences: 10,
      })
    }
  }

  async generate(prompt: string, max = 512, grammar?: LlamaGrammar): Promise<ModelResponse<string>> {
    await this.init()

    const seq = this.context!.getSequence()
    const loader = await import('node-llama-cpp')
    const session = new loader.LlamaChatSession({ contextSequence: seq })

    try {
      const res = await session.prompt(prompt, {
        maxTokens: max,
        temperature: 0.4,
        topP: 0.95,
        grammar,
      })
      const tokens = seq.tokenMeter.usedOutputTokens
      return { data: res.trim(), tokens, error: undefined }
    } catch (err) {
      logger.error('LLM generation failed: ' + err)
      return {
        data: '',
        tokens: 0,
        error: 'Failed to generate response from local model.',
      }
    } finally {
      session.dispose()
      seq.dispose()
    }
  }

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

    if (!query || query.trim() === '') {
      return { data: fallback, tokens: 0, error: undefined }
    }
    await this.init()
    const loader = await import('node-llama-cpp')

    const grammar = new loader.LlamaJsonSchemaGrammar(this.llama!, {
      type: 'object',
      properties: {
        action: { type: ['string', 'null'] },
        emotions: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['happy', 'sad', 'angry', 'surprised', 'excited', 'neutral', 'fearful', 'disgusted'],
          },
        },
        objects: { type: 'array', items: { type: 'string' } },
        duration: { type: ['number', 'null'] },
        shot_type: {
          type: ['string', 'null'],
          enum: ['close-up', 'medium-shot', 'long-shot', null],
        },
        aspect_ratio: {
          type: 'string',
          enum: ['16:9', '9:16', '1:1', '4:3', '8:7'],
        },
        transcriptionQuery: { type: ['string', 'null'] },
        description: { type: 'string' },
        faces: { type: 'array', items: { type: 'string' } },
      },
      required: ['emotions', 'objects', 'duration', 'aspect_ratio', 'description', 'faces'],
    } as const)

    const history = chatHistory?.length ? chatHistory.map((h) => `${h.sender}: ${h.text}`).join('\n') : ''

    const { data: raw, tokens, error } = await this.generate(SEARCH_PROMPT(query, history), 1024, grammar)

    if (error || !raw) {
      return { data: fallback, tokens: 0, error }
    }

    try {
      const parsed = JSON.parse(raw.trim())
      return {
        data: VideoSearchParamsSchema.parse({
          ...parsed,
          semanticQuery: query,
          locations: [],
          camera: null,
          detectedText: null,
        }),
        tokens,
        error: undefined,
      }
    } catch (parseError) {
      logger.error('Failed to parse JSON:' + parseError)
      return { data: fallback, tokens: 0, error: 'Invalid JSON' }
    }
  }
  async generateAssistantMessage(
    userPrompt: string,
    count: number,
    chatHistory?: ChatMessage[]
  ): Promise<ModelResponse<string>> {
    const history = chatHistory?.length ? chatHistory.map((h) => `${h.sender}: ${h.text}`).join('\n') : ''

    return await this.generate(ASSISTANT_MESSAGE_PROMPT(userPrompt, count, history))
  }

  async generateCompilationResponse(
    userPrompt: string,
    count: number,
    chatHistory?: ChatMessage[]
  ): Promise<ModelResponse<string>> {
    const history = chatHistory?.length ? chatHistory.map((h) => `${h.sender}: ${h.text}`).join('\n') : ''
    return await this.generate(VIDEO_COMPILATION_MESSAGE_PROMPT(userPrompt, count, history))
  }
  async generateYearInReviewResponse(
    stats: YearStats,
    videos: VideoWithScenes[],
    extraDetails: string
  ): Promise<ModelResponse<YearInReviewData | null>> {
    try {
      let prompt = YEAR_IN_REVIEW(stats, videos, extraDetails)
      let promptLength = prompt.length
      let estimatedTokens = Math.ceil(promptLength / 4)

      while (estimatedTokens > 2048 && videos.length > 1) {
        videos = videos.slice(0, Math.floor(videos.length / 2))
        prompt = YEAR_IN_REVIEW(stats, videos, extraDetails)
        promptLength = prompt.length
        estimatedTokens = Math.ceil(promptLength / 4)
        logger.warn(`Prompt too long, truncating videos to ${videos.length} items`)
      }

      if (estimatedTokens > 2048) {
        logger.error('Prompt too long even after truncation')
        return { data: null, tokens: 0, error: 'Prompt too long even after truncation' }
      }

      await this.init()
      const loader = await import('node-llama-cpp')
      const grammar = new loader.LlamaJsonSchemaGrammar(this.llama!, {
        type: 'object',
        properties: {
          slides: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: [
                    'hero',
                    'openingScene',
                    'scenes',
                    'categories',
                    'objects',
                    'objectStory',
                    'faces',
                    'funFacts',
                    'weekendPersonality',
                    'weekdayEnergy',
                    'locations',
                    'colorTemperature',
                    'moodboard',
                    'yourCreativeDNA',
                    'vibeScore',
                    'rareGems',
                    'mostSpokenWords',
                    'snapshotOfTheYear',
                    'closingScene',
                    'share',
                  ],
                },
                title: { type: 'string' },
                content: { type: 'string' },
                interactiveElements: { type: 'string' },
              },
              required: ['type', 'title', 'content', 'interactiveElements'],
            },
          },
          topScenes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                videoSource: { type: 'string' },
                thumbnailUrl: { type: 'string' },
                duration: { type: 'number' },
                description: { type: 'string' },
                faces: { type: 'array', items: { type: 'string' } },
                emotions: { type: 'array', items: { type: 'string' } },
                objects: { type: 'array', items: { type: 'string' } },
                location: { type: 'string' },
                dateDisplay: { type: 'string' },
              },
              required: ['videoSource', 'thumbnailUrl', 'duration', 'faces', 'emotions', 'objects'],
            },
          },
          topObjects: {
            type: 'array',
            items: {
              type: 'object',
              properties: { name: { type: 'string' }, count: { type: 'number' } },
              required: ['name', 'count'],
            },
          },
          topFaces: {
            type: 'array',
            items: {
              type: 'object',
              properties: { name: { type: 'string' }, count: { type: 'number' } },
              required: ['name', 'count'],
            },
          },
          topEmotions: {
            type: 'array',
            items: {
              type: 'object',
              properties: { emotion: { type: 'string' }, count: { type: 'number' } },
              required: ['emotion', 'count'],
            },
          },
          topLocations: {
            type: 'array',
            items: {
              type: 'object',
              properties: { name: { type: 'string' }, count: { type: 'number' } },
              required: ['name', 'count'],
            },
          },
          mostSpokenWords: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['slides', 'topObjects', 'topFaces', 'topEmotions', 'topLocations', 'topScenes', 'mostSpokenWords'],
      } as const)
      const { data: raw, tokens, error } = await this.generate(prompt, 2048, grammar)

      if (error || !raw) {
        logger.error('Failed to generate year in review: ' + error)
        return { data: null, tokens: 0, error }
      }

      try {
        const parsed = JSON.parse(raw.trim())
        const validated = YearInReviewDataSchema.parse(parsed)
        return { data: validated, tokens, error: undefined }
      } catch (parseError) {
        logger.error('Failed to parse year in review JSON: ' + parseError)
        return { data: null, tokens: 0, error: 'Invalid JSON response from AI' }
      }
    } catch (err) {
      logger.error('Unexpected error in generateYearInReviewResponse: ' + err)
      return { data: null, tokens: 0, error: 'Unexpected error' }
    }
  }

  async generateGeneralResponse(prompt: string, history?: ChatMessage[]): Promise<ModelResponse<string>> {
    const context = history?.length ? history.map((h) => `${h.sender}: ${h.text}`).join('\n') : ''

    return await this.generate(GENERAL_RESPONSE_PROMPT(prompt, context))
  }

  async classifyIntent(prompt: string, chatHistory?: ChatMessage[]): Promise<ModelResponse<any>> {
    const history = chatHistory?.length ? chatHistory.map((h) => `${h.sender}: ${h.text}`).join('\n') : ''
    const { data: raw, tokens, error } = await this.generate(CLASSIFY_INTENT_PROMPT(prompt, history))

    if (error || !raw) {
      return { data: null, tokens: 0, error }
    }

    try {
      return {
        data: JSON.parse(raw.replace(/```json|```/g, '').trim()),
        tokens,
        error: undefined,
      }
    } catch {
      return {
        data: null,
        tokens: 0,
        error: 'Failed to parse intent from local model.',
      }
    }
  }

  async generateAnalyticsResponse(
    prompt: string,
    analytics: Awaited<ReturnType<typeof getVideoAnalytics>>,
    chatHistory?: ChatMessage[]
  ): Promise<ModelResponse<string>> {
    const history = chatHistory?.length ? chatHistory.map((h) => `${h.sender}: ${h.text}`).join('\n') : ''
    return await this.generate(ANALYTICS_RESPONSE_PROMPT(prompt, analytics, history))
  }

  async cleanup(): Promise<void> {
    await this.context?.dispose()
    await this.model?.dispose()
    this.context = null
    this.model = null
    this.llama = null
  }
}

export const LocalModel = new LocalLLM()
