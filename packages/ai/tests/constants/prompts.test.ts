import { describe, expect, it } from 'vitest'
import {
  ANALYTICS_RESPONSE_PROMPT,
  ASSISTANT_MESSAGE_PROMPT,
  CLASSIFY_INTENT_PROMPT,
  GENERAL_RESPONSE_PROMPT,
  SEARCH_PROMPT,
  VIDEO_COMPILATION_MESSAGE_PROMPT,
  YEAR_IN_REVIEW,
  buildPromptInstructions,
} from '@ai/constants/prompts'
import type { VideoAnalytics } from '@shared/types/analytics'
import type { YearStats } from '@shared/types/stats'

const russianInstructions = buildPromptInstructions({ language: 'ru' })

describe('localized AI prompts', () => {
  it('adds Russian instructions while preserving English JSON schema keys for search', () => {
    const prompt = SEARCH_PROMPT('найди собаку', '', russianInstructions)

    expect(prompt).toContain('Отвечай на русском')
    expect(prompt).toContain('Вход: "Покажи мою собаку, которая бегает"')
    expect(prompt).toContain('"semanticQuery"')
    expect(prompt).toContain('"searchMode"')
    expect(prompt).toContain('"objects":["dog"]')
  })

  it('adds Russian intent examples while preserving canonical intent values', () => {
    const prompt = CLASSIFY_INTENT_PROMPT('сколько у меня клипов?', '', russianInstructions)

    expect(prompt).toContain('Отвечай на русском')
    expect(prompt).toContain('Вход: "Сколько у меня клипов?"')
    expect(prompt).toContain('"type": "analytics"')
    expect(prompt).toContain('"keepPrevious"')
  })

  it('adds Russian response instructions to all user-facing response prompts', () => {
    const analytics: VideoAnalytics = {
      totalDuration: 0,
      totalDurationFormatted: '0s',
      uniqueVideos: 0,
      totalScenes: 0,
      dateRange: {},
      emotionCounts: {},
      faceOccurrences: {},
      objectsOccurrences: {},
      averageSceneDuration: 0,
    }
    const stats: YearStats = {
      totalVideos: 0,
      totalDuration: 0,
      totalScenes: 0,
      topEmotions: [],
      topFaces: [],
      topShotTypes: [],
      topObjects: [],
      categories: [],
      topWords: [],
      longestScene: { duration: 0, description: '', videoSource: '' },
      shortestScene: { duration: 0, description: '', videoSource: '' },
    }

    const prompts = [
      ANALYTICS_RESPONSE_PROMPT('что чаще всего?', analytics, '', russianInstructions),
      ASSISTANT_MESSAGE_PROMPT('найди море', 2, '', russianInstructions),
      VIDEO_COMPILATION_MESSAGE_PROMPT('сделай подборку', 3, '', russianInstructions),
      GENERAL_RESPONSE_PROMPT('привет', '', russianInstructions),
      YEAR_IN_REVIEW(stats, [], '', russianInstructions),
    ]

    for (const prompt of prompts) {
      expect(prompt).toContain('Отвечай на русском')
    }
  })
})
