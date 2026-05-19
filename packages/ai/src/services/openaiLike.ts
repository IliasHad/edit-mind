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
  buildPromptInstructions,
} from '../constants/prompts'
import { OPENAI_LIKE_BASE_URL, OPENAI_LIKE_API_KEY, OPENAI_LIKE_MODEL } from '@ai/constants'
import { VideoSearchParamsSchema } from '@shared/schemas/search'
import { YearInReviewData, YearInReviewDataSchema } from '@shared/schemas/yearInReview'
import type { VideoWithScenes } from '@shared/types/video'
import type { YearStats } from '@shared/types/stats'
import { ModelResponse, type AIRequestOptions } from '@ai/types/ai'
import { logger } from '@shared/services/logger'
import { VideoSearchParams } from '@shared/types/search'
import { VideoAnalytics } from '@shared/types/analytics'
import type { IntentData } from '@shared/types/chat'

const OPENAI_LIKE_PROVIDER = 'openai-like'
const EMPTY_RESPONSE_ERROR = 'Empty response from OpenAI-like model'

function sanitizeBaseURL(baseURL?: string): string | undefined {
  if (!baseURL) return undefined

  try {
    const url = new URL(baseURL)
    url.username = ''
    url.password = ''
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return '[invalid-url]'
  }
}

function getRequestId(response: unknown): string | undefined {
  return typeof response === 'object' && response !== null && '_request_id' in response
    ? String((response as { _request_id?: string })._request_id ?? '') || undefined
    : undefined
}

function truncateForLog(value: unknown, maxLength = 500): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

function getErrorField(error: unknown, field: string): unknown {
  return typeof error === 'object' && error !== null && field in error
    ? (error as Record<string, unknown>)[field]
    : undefined
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function buildOpenAI() {
  logger.info(
    {
      provider: OPENAI_LIKE_PROVIDER,
      model: OPENAI_LIKE_MODEL,
      baseURL: sanitizeBaseURL(OPENAI_LIKE_BASE_URL),
      hasApiKey: Boolean(OPENAI_LIKE_API_KEY),
    },
    'Initialized OpenAI-like client'
  )

  const params: ConstructorParameters<typeof OpenAI>[0] = {
    baseURL: OPENAI_LIKE_BASE_URL,
    apiKey: OPENAI_LIKE_API_KEY || '',
  }
  return new OpenAI(params)
}

function formatHistory(chatHistory?: ChatMessage[]): string {
  return chatHistory?.length
    ? chatHistory
        .slice(-10)
        .map((m) => `${m.sender}: ${m.text}`)
        .join('\n')
    : ''
}

async function chatCompletion(
  openai: OpenAI,
  operation: string,
  systemPrompt: string,
  userMessage: string,
  chatHistory?: ChatMessage[],
  responseFormat?: 'json' | 'text'
): Promise<ModelResponse<string>> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
  ]

  if (chatHistory?.length) {
    for (const m of chatHistory.slice(-10)) {
      messages.push({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text ?? '',
      } as OpenAI.ChatCompletionMessageParam)
    }
  }

  messages.push({ role: 'user', content: userMessage })

  const body: OpenAI.ChatCompletionCreateParamsNonStreaming = {
    model: OPENAI_LIKE_MODEL,
    messages,
    max_tokens: 4096,
  }

  if (responseFormat === 'json') {
    body.response_format = { type: 'json_object' }
  }

  return createChatCompletion(openai, operation, body, systemPrompt.length + userMessage.length, responseFormat)
}

async function chatCompletionWithPrompt(
  openai: OpenAI,
  operation: string,
  fullPrompt: string,
  responseFormat?: 'json' | 'text'
): Promise<ModelResponse<string>> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'user', content: fullPrompt },
  ]

  const body: OpenAI.ChatCompletionCreateParamsNonStreaming = {
    model: OPENAI_LIKE_MODEL,
    messages,
    max_tokens: 4096,
  }

  if (responseFormat === 'json') {
    body.response_format = { type: 'json_object' }
  }

  return createChatCompletion(openai, operation, body, fullPrompt.length, responseFormat)
}

async function createChatCompletion(
  openai: OpenAI,
  operation: string,
  body: OpenAI.ChatCompletionCreateParamsNonStreaming,
  promptLength: number,
  responseFormat?: 'json' | 'text'
): Promise<ModelResponse<string>> {
  const startedAt = Date.now()

  logger.debug(
    {
      provider: OPENAI_LIKE_PROVIDER,
      operation,
      model: OPENAI_LIKE_MODEL,
      responseFormat: responseFormat ?? 'text',
      promptLength,
      messagesCount: body.messages.length,
      maxTokens: body.max_tokens,
    },
    'OpenAI-like chat completion request'
  )

  let response: OpenAI.Chat.Completions.ChatCompletion
  try {
    response = await openai.chat.completions.create(body)
  } catch (error) {
    const elapsedMs = Date.now() - startedAt
    logger.error(
      {
        provider: OPENAI_LIKE_PROVIDER,
        operation,
        model: OPENAI_LIKE_MODEL,
        elapsedMs,
        name: getErrorField(error, 'name'),
        status: getErrorField(error, 'status'),
        code: getErrorField(error, 'code'),
        type: getErrorField(error, 'type'),
        requestId: getErrorField(error, 'request_id') ?? getErrorField(error, 'requestId'),
        message: getErrorMessage(error),
      },
      'OpenAI-like chat completion failed'
    )
    throw error
  }

  const elapsedMs = Date.now() - startedAt
  const choice = response.choices?.[0]
  const text = choice?.message?.content?.trim() ?? ''
  const tokens = response.usage?.total_tokens ?? 0
  const requestId = getRequestId(response)
  const finishReason = choice?.finish_reason

  logger.debug(
    {
      provider: OPENAI_LIKE_PROVIDER,
      operation,
      model: OPENAI_LIKE_MODEL,
      requestId,
      elapsedMs,
      choicesCount: response.choices?.length ?? 0,
      finishReason,
      contentLength: text.length,
      tokens,
    },
    'OpenAI-like chat completion response'
  )

  if (!text) {
    logger.warn(
      {
        provider: OPENAI_LIKE_PROVIDER,
        operation,
        model: OPENAI_LIKE_MODEL,
        requestId,
        elapsedMs,
        choicesCount: response.choices?.length ?? 0,
        finishReason,
        contentLength: 0,
        tokens,
        messagePreview: truncateForLog(choice?.message ?? null),
      },
      'OpenAI-like model returned empty content'
    )

    return { data: '', tokens, error: EMPTY_RESPONSE_ERROR }
  }

  return { data: text, tokens, error: undefined }
}

class OpenaiLikeModelImpl {
  private client: OpenAI | null = null

  private getOpenAI(): OpenAI {
    if (!this.client) {
      this.client = buildOpenAI()
    }
    return this.client
  }

  async generateActionFromPrompt(
    query: string,
    chatHistory?: ChatMessage[],
    options?: AIRequestOptions
  ): Promise<ModelResponse<VideoSearchParams>> {
    const fallback = VideoSearchParamsSchema.parse({})

    if (!query || query.trim() === '') return { data: fallback, tokens: 0, error: undefined }

    try {
      const openai = this.getOpenAI()
      const history = formatHistory(chatHistory)
      const prompt = SEARCH_PROMPT(query, history, buildPromptInstructions(options))

      const { data: raw, tokens, error } = await chatCompletionWithPrompt(openai, 'generateActionFromPrompt', prompt, 'json')

      if (error || !raw) return { data: fallback, tokens, error: error ?? 'No response from model' }

      try {
        const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
        return {
          data: VideoSearchParamsSchema.parse(parsed),
          tokens,
          error: undefined,
        }
      } catch (parseError) {
        logger.error('Failed to parse JSON: ' + parseError)
        return { data: fallback, tokens: 0, error: 'Invalid JSON' }
      }
    } catch (err) {
      logger.error('OpenAI-like generateActionFromPrompt failed: ' + err)
      throw err
    }
  }

  async generateAssistantMessage(
    userPrompt: string,
    count: number,
    chatHistory?: ChatMessage[],
    options?: AIRequestOptions
  ): Promise<ModelResponse<string>> {
    try {
      const openai = this.getOpenAI()
      const history = formatHistory(chatHistory)
      const prompt = ASSISTANT_MESSAGE_PROMPT(userPrompt, count, history, buildPromptInstructions(options))

      return chatCompletionWithPrompt(openai, 'generateAssistantMessage', prompt, 'text')
    } catch (error) {
      logger.error('OpenAI-like generateAssistantMessage error: ' + error)
      throw error
    }
  }

  async generateCompilationResponse(
    userPrompt: string,
    count: number,
    chatHistory?: ChatMessage[],
    options?: AIRequestOptions
  ): Promise<ModelResponse<string>> {
    try {
      const openai = this.getOpenAI()
      const history = formatHistory(chatHistory)
      const prompt = VIDEO_COMPILATION_MESSAGE_PROMPT(userPrompt, count, history, buildPromptInstructions(options))

      return chatCompletionWithPrompt(openai, 'generateCompilationResponse', prompt, 'text')
    } catch (error) {
      logger.error('OpenAI-like generateCompilationResponse error: ' + error)
      throw error
    }
  }

  async generateYearInReviewResponse(
    stats: YearStats,
    videos: VideoWithScenes[],
    extraDetails: string,
    options?: AIRequestOptions
  ): Promise<ModelResponse<YearInReviewData | null>> {
    try {
      const openai = this.getOpenAI()
      const prompt = YEAR_IN_REVIEW(stats, videos, extraDetails, buildPromptInstructions(options))

      const { data: raw, tokens, error } = await chatCompletionWithPrompt(openai, 'generateYearInReviewResponse', prompt, 'json')

      if (error || !raw) return { data: null, tokens, error }

      try {
        const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
        const validated = YearInReviewDataSchema.parse(parsed)
        return { data: validated, tokens, error: undefined }
      } catch (parseError) {
        logger.error('Failed to parse year in review JSON: ' + parseError)
        return { data: null, tokens: 0, error: 'Invalid JSON response from AI' }
      }
    } catch (err) {
      logger.error('OpenAI-like generateYearInReviewResponse error: ' + err)
      throw err
    }
  }

  async generateGeneralResponse(
    userPrompt: string,
    chatHistory?: ChatMessage[],
    options?: AIRequestOptions
  ): Promise<ModelResponse<string>> {
    try {
      const openai = this.getOpenAI()
      const history = formatHistory(chatHistory)
      const prompt = GENERAL_RESPONSE_PROMPT(userPrompt, history, buildPromptInstructions(options))

      return chatCompletionWithPrompt(openai, 'generateGeneralResponse', prompt, 'text')
    } catch (err) {
      logger.error('OpenAI-like generateGeneralResponse error: ' + err)
      throw err
    }
  }

  async classifyIntent(
    prompt: string,
    chatHistory?: ChatMessage[],
    options?: AIRequestOptions
  ): Promise<ModelResponse<IntentData>> {
    try {
      const openai = this.getOpenAI()
      const history = formatHistory(chatHistory)
      const fullPrompt = CLASSIFY_INTENT_PROMPT(prompt, history, buildPromptInstructions(options))

      const { data: raw, tokens, error } = await chatCompletionWithPrompt(openai, 'classifyIntent', fullPrompt, 'json')

      if (error || !raw) return { data: { type: 'general', needsVideoData: false, keepPrevious: false }, tokens, error }

      try {
        const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
        return { data: parsed, tokens, error: undefined }
      } catch {
        return { data: { type: 'general', needsVideoData: false, keepPrevious: false }, tokens: 0, error: 'Failed to parse intent' }
      }
    } catch (error) {
      logger.error('OpenAI-like classifyIntent error: ' + error)
      throw error
    }
  }

  async generateAnalyticsResponse(
    userPrompt: string,
    analytics: VideoAnalytics,
    chatHistory?: ChatMessage[],
    options?: AIRequestOptions
  ): Promise<ModelResponse<string>> {
    try {
      const openai = this.getOpenAI()
      const history = formatHistory(chatHistory)
      const prompt = ANALYTICS_RESPONSE_PROMPT(userPrompt, analytics, history, buildPromptInstructions(options))

      return chatCompletionWithPrompt(openai, 'generateAnalyticsResponse', prompt, 'text')
    } catch (error) {
      logger.error('OpenAI-like generateAnalyticsResponse error: ' + error)
      throw error
    }
  }
}

export const OpenaiLikeModel = new OpenaiLikeModelImpl()
