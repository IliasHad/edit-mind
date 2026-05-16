import type { VideoSearchParams } from '@shared/types/search'
import type { ChatMessage } from '@prisma/client'
import { YearStats } from '@shared/types/stats'
import { YearInReviewData } from '@shared/schemas/yearInReview'
import { VideoWithScenes } from '@shared/types/video'
import type { IntentData } from '@shared/types/chat'
import { VideoAnalytics } from '@shared/types/analytics'
import type { AppLanguage } from '@shared/types/language'

export interface AIRequestOptions {
  language?: AppLanguage
  projectInstructions?: string
}

export interface AIModel {
  generateActionFromPrompt(
    query: string,
    chatHistory?: ChatMessage[],
    options?: AIRequestOptions
  ): Promise<{ data: VideoSearchParams; tokens: number; error?: string | undefined }>
  generateAssistantMessage(
    userPrompt: string,
    resultsCount: number,
    chatHistory?: ChatMessage[],
    options?: AIRequestOptions
  ): Promise<{ data: string; tokens: number; error?: string | undefined }>
  generateGeneralResponse(
    userPrompt: string,
    chatHistory?: ChatMessage[],
    options?: AIRequestOptions
  ): Promise<{ data: string; tokens: number; error?: string | undefined }>
  classifyIntent(
    prompt: string,
    chatHistory?: ChatMessage[],
    options?: AIRequestOptions
  ): Promise<{
    data: IntentData
    tokens: number
    error?: string | undefined
  }>
  generateAnalyticsResponse(
    userPrompt: string,
    analytics: VideoAnalytics,
    chatHistory?: ChatMessage[],
    options?: AIRequestOptions
  ): Promise<{ data: string; tokens: number; error?: string | undefined }>
  generateCompilationResponse(
    userPrompt: string,
    resultsCount: number,
    chatHistory?: ChatMessage[],
    options?: AIRequestOptions
  ): Promise<{ data: string; tokens: number; error?: string | undefined }>
  cleanUp?(): Promise<void>
  generateYearInReviewResponse(
    stats: YearStats,
    videos: VideoWithScenes[],
    extraDetails: string,
    options?: AIRequestOptions
  ): Promise<{ data: YearInReviewData | null; tokens: number; error?: string | undefined }>
}


export type ModelResponse<T> = {
  data: T
  error?: string
  tokens: number
}