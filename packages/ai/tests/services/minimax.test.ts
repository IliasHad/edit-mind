import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.fn()

vi.mock('@shared/services/logger', () => ({
  logger: { error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}))

vi.mock('@ai/constants', () => ({
  MINIMAX_API_KEY: 'test-minimax-key',
  MINIMAX_MODEL: 'MiniMax-M1',
}))

vi.mock('openai', () => {
  const MockOpenAI = function (this: Record<string, unknown>, _config: unknown) {
    this.chat = {
      completions: {
        create: mockCreate,
      },
    }
  }
  return { default: MockOpenAI }
})

vi.mock('@ai/utils', () => ({
  formatHistory: vi.fn().mockReturnValue(''),
}))

vi.mock('@ai/constants/prompts', () => ({
  SEARCH_PROMPT: vi.fn().mockReturnValue('search prompt'),
  ASSISTANT_MESSAGE_PROMPT: vi.fn().mockReturnValue('assistant prompt'),
  VIDEO_COMPILATION_MESSAGE_PROMPT: vi.fn().mockReturnValue('compilation prompt'),
  YEAR_IN_REVIEW: vi.fn().mockReturnValue('year review prompt'),
  GENERAL_RESPONSE_PROMPT: vi.fn().mockReturnValue('general prompt'),
  CLASSIFY_INTENT_PROMPT: vi.fn().mockReturnValue('classify prompt'),
  ANALYTICS_RESPONSE_PROMPT: vi.fn().mockReturnValue('analytics prompt'),
}))

vi.mock('@shared/schemas/search', () => ({
  VideoSearchParamsSchema: {
    parse: vi.fn().mockImplementation((v: unknown) => v ?? {}),
  },
}))

vi.mock('@shared/schemas/yearInReview', () => ({
  YearInReviewDataSchema: {
    parse: vi.fn().mockImplementation((v: unknown) => v),
  },
}))

describe('MiniMax Model', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate action from prompt with JSON response format', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              emotions: [],
              objects: ['car'],
              faces: [],
              limit: 30,
            }),
          },
        },
      ],
      usage: { prompt_tokens: 100 },
    })

    const { MiniMaxModel } = await import('@ai/services/minimax')
    const result = await MiniMaxModel.generateActionFromPrompt('find cars')

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'MiniMax-M1',
        response_format: { type: 'json_object' },
      })
    )
    expect(result.tokens).toBe(100)
    expect(result.error).toBeUndefined()
  })

  it('should return fallback for empty query', async () => {
    const { MiniMaxModel } = await import('@ai/services/minimax')
    const result = await MiniMaxModel.generateActionFromPrompt('')

    expect(mockCreate).not.toHaveBeenCalled()
    expect(result.tokens).toBe(0)
  })

  it('should generate assistant message', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'Here are 5 scenes matching your request.' } }],
      usage: { prompt_tokens: 50 },
    })

    const { MiniMaxModel } = await import('@ai/services/minimax')
    const result = await MiniMaxModel.generateAssistantMessage('find beach videos', 5)

    expect(result.data).toBe('Here are 5 scenes matching your request.')
    expect(result.tokens).toBe(50)
  })

  it('should generate general response', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'Edit Mind helps you search videos.' } }],
      usage: { prompt_tokens: 30 },
    })

    const { MiniMaxModel } = await import('@ai/services/minimax')
    const result = await MiniMaxModel.generateGeneralResponse('what is edit mind?')

    expect(result.data).toBe('Edit Mind helps you search videos.')
    expect(result.tokens).toBe(30)
  })

  it('should classify intent correctly', async () => {
    const intentData = { type: 'analytics', needsVideoData: true }
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(intentData) } }],
      usage: { prompt_tokens: 20 },
    })

    const { MiniMaxModel } = await import('@ai/services/minimax')
    const result = await MiniMaxModel.classifyIntent('show me video stats')

    expect(result.data).toEqual(intentData)
    expect(result.tokens).toBe(20)
  })

  it('should generate compilation response', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'Your compilation of 3 scenes is ready.' } }],
      usage: { prompt_tokens: 40 },
    })

    const { MiniMaxModel } = await import('@ai/services/minimax')
    const result = await MiniMaxModel.generateCompilationResponse('compile sunset shots', 3)

    expect(result.data).toBe('Your compilation of 3 scenes is ready.')
    expect(result.tokens).toBe(40)
  })

  it('should generate analytics response', async () => {
    const analytics = {
      totalDuration: 3600,
      totalDurationFormatted: '1h',
      uniqueVideos: 10,
      totalScenes: 50,
      dateRange: { oldest: new Date(), newest: new Date() },
      emotionCounts: { happy: 20 },
      faceOccurrences: {},
      objectsOccurrences: { car: 5 },
      averageSceneDuration: 12,
    }

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'Your library has 10 videos totaling 1 hour.' } }],
      usage: { prompt_tokens: 80 },
    })

    const { MiniMaxModel } = await import('@ai/services/minimax')
    const result = await MiniMaxModel.generateAnalyticsResponse('summarize analytics', analytics)

    expect(result.data).toBe('Your library has 10 videos totaling 1 hour.')
    expect(result.tokens).toBe(80)
  })

  it('should generate year in review response', async () => {
    const yearData = {
      title: 'Your 2024',
      sections: [],
    }
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(yearData) } }],
      usage: { prompt_tokens: 120 },
    })

    const stats = {
      totalVideos: 10,
      totalDuration: 100,
      totalScenes: 100,
      topEmotions: [],
      topFaces: [],
      topShotTypes: [],
      topObjects: [],
      categories: [],
      topWords: [],
      longestScene: { duration: 10, description: '', videoSource: 'test.mp4' },
      shortestScene: { duration: 1, description: '', videoSource: 'test2.mp4' },
    }

    const { MiniMaxModel } = await import('@ai/services/minimax')
    const result = await MiniMaxModel.generateYearInReviewResponse(stats, [], 'extra details')

    expect(result.data).toEqual(yearData)
    expect(result.tokens).toBe(120)
  })

  it('should strip think tags from response', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: '<think>internal reasoning</think>The actual response.',
          },
        },
      ],
      usage: { prompt_tokens: 15 },
    })

    const { MiniMaxModel } = await import('@ai/services/minimax')
    const result = await MiniMaxModel.generateGeneralResponse('test')

    expect(result.data).toBe('The actual response.')
  })

  it('should handle missing content gracefully', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: null } }],
      usage: { prompt_tokens: 5 },
    })

    const { MiniMaxModel } = await import('@ai/services/minimax')
    const result = await MiniMaxModel.generateGeneralResponse('test')

    expect(result.data).toBe('')
  })

  it('should return error string for invalid JSON in generateActionFromPrompt', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'not valid json' } }],
      usage: { prompt_tokens: 10 },
    })

    const { MiniMaxModel } = await import('@ai/services/minimax')
    const result = await MiniMaxModel.generateActionFromPrompt('test query')

    expect(result.error).toBe('Invalid JSON')
    expect(result.tokens).toBe(0)
  })

  it('should return null data for invalid year in review JSON', async () => {
    const { YearInReviewDataSchema } = await import('@shared/schemas/yearInReview')
    ;(YearInReviewDataSchema.parse as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error('Invalid schema')
    })

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"invalid": true}' } }],
      usage: { prompt_tokens: 10 },
    })

    const stats = {
      totalVideos: 1,
      totalDuration: 10,
      totalScenes: 5,
      topEmotions: [],
      topFaces: [],
      topShotTypes: [],
      topObjects: [],
      categories: [],
      topWords: [],
      longestScene: { duration: 5, description: '', videoSource: 'a.mp4' },
      shortestScene: { duration: 1, description: '', videoSource: 'b.mp4' },
    }

    const { MiniMaxModel } = await import('@ai/services/minimax')
    const result = await MiniMaxModel.generateYearInReviewResponse(stats, [], 'details')

    expect(result.data).toBeNull()
    expect(result.error).toBe('Invalid JSON response from AI')
  })

  it('should set temperature to 0.7', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'ok' } }],
      usage: { prompt_tokens: 1 },
    })

    const { MiniMaxModel } = await import('@ai/services/minimax')
    await MiniMaxModel.generateGeneralResponse('test')

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.7,
      })
    )
  })

  it('should use MiniMax-M1 as default model', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'ok' } }],
      usage: { prompt_tokens: 1 },
    })

    const { MiniMaxModel } = await import('@ai/services/minimax')
    await MiniMaxModel.generateGeneralResponse('test')

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'MiniMax-M1',
      })
    )
  })
})
