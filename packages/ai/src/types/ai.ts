import { getVideoAnalytics } from '@shared/utils/analytics'
import type { VideoSearchParams } from '@shared/types/search'
import type { ChatMessage } from '@prisma/client'
import { YearStats } from '@shared/types/stats'
import { YearInReviewData } from '@shared/schemas/yearInReview'
import { VideoWithScenes } from '@shared/types/video'

export interface AIModel {
  generateActionFromPrompt(
    query: string,
    chatHistory?: ChatMessage[],
    projectInstructions?: string
  ): Promise<{ data: VideoSearchParams; tokens: number; error?: string | undefined }>
  generateAssistantMessage(
    userPrompt: string,
    resultsCount: number,
    chatHistory?: ChatMessage[],
    projectInstructions?: string
  ): Promise<{ data: string; tokens: number; error?: string | undefined }>
  generateGeneralResponse(
    userPrompt: string,
    chatHistory?: ChatMessage[]
  ): Promise<{ data: string; tokens: number; error?: string | undefined }>
  classifyIntent(
    prompt: string,
    chatHistory?: ChatMessage[],
    projectInstructions?: string
  ): Promise<{
    data: {
      type?: 'compilation' | 'analytics' | 'general' | 'refinement' | 'similarity'
      needsVideoData?: boolean
      keepPrevious?: boolean
    }
    tokens: number
    error?: string | undefined
  }>
  generateAnalyticsResponse(
    userPrompt: string,
    analytics: Awaited<ReturnType<typeof getVideoAnalytics>>,
    chatHistory?: ChatMessage[],
    projectInstructions?: string
  ): Promise<{ data: string; tokens: number; error?: string | undefined }>
  generateCompilationResponse(
    userPrompt: string,
    resultsCount: number,
    chatHistory?: ChatMessage[],
    projectInstructions?: string
  ): Promise<{ data: string; tokens: number; error?: string | undefined }>
  cleanUp?(): Promise<void>
  generateYearInReviewResponse(
    stats: YearStats,
    videos: VideoWithScenes[],
    extraDetails: string,
    projectInstructions?: string
  ): Promise<{ data: YearInReviewData | null; tokens: number; error?: string | undefined }>
}


export type ModelResponse<T> = {
  data: T
  error?: string
  tokens: number
}