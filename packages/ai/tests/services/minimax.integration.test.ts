import { describe, it, expect, vi, beforeEach } from 'vitest'

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY

const describeIntegration = MINIMAX_API_KEY ? describe : describe.skip

describeIntegration('MiniMax Integration Tests (requires MINIMAX_API_KEY)', () => {
  beforeEach(() => {
    vi.resetModules()

    vi.doMock('@shared/services/logger', () => ({
      logger: { error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
    }))

    vi.doMock('@ai/utils', () => ({
      formatHistory: vi.fn().mockReturnValue(''),
    }))

    vi.doMock('@shared/schemas/search', () => ({
      VideoSearchParamsSchema: {
        parse: vi.fn().mockImplementation((v: unknown) => v ?? {}),
      },
    }))

    vi.doMock('@shared/schemas/yearInReview', () => ({
      YearInReviewDataSchema: {
        parse: vi.fn().mockImplementation((v: unknown) => v),
      },
    }))

    vi.doMock('@ai/constants', () => ({
      MINIMAX_API_KEY,
      MINIMAX_MODEL: process.env.MINIMAX_MODEL || 'MiniMax-M1',
    }))
  })

  it('should generate a general response from MiniMax API', async () => {
    vi.doMock('@ai/constants/prompts', () => ({
      GENERAL_RESPONSE_PROMPT: vi.fn().mockReturnValue('Respond with exactly one word: hello'),
      SEARCH_PROMPT: vi.fn(),
      ASSISTANT_MESSAGE_PROMPT: vi.fn(),
      VIDEO_COMPILATION_MESSAGE_PROMPT: vi.fn(),
      YEAR_IN_REVIEW: vi.fn(),
      CLASSIFY_INTENT_PROMPT: vi.fn(),
      ANALYTICS_RESPONSE_PROMPT: vi.fn(),
    }))

    const { MiniMaxModel } = await import('@ai/services/minimax')
    const result = await MiniMaxModel.generateGeneralResponse('say hello')

    expect(result.data).toBeTruthy()
    expect(typeof result.data).toBe('string')
    expect(result.tokens).toBeGreaterThan(0)
  }, 30000)

  it('should classify intent as JSON', async () => {
    vi.doMock('@ai/constants/prompts', () => ({
      CLASSIFY_INTENT_PROMPT: vi.fn().mockReturnValue(
        'You must respond with only valid JSON, no other text. Output: {"type": "general", "needsVideoData": false}'
      ),
      SEARCH_PROMPT: vi.fn(),
      ASSISTANT_MESSAGE_PROMPT: vi.fn(),
      VIDEO_COMPILATION_MESSAGE_PROMPT: vi.fn(),
      YEAR_IN_REVIEW: vi.fn(),
      GENERAL_RESPONSE_PROMPT: vi.fn(),
      ANALYTICS_RESPONSE_PROMPT: vi.fn(),
    }))

    const { MiniMaxModel } = await import('@ai/services/minimax')
    const result = await MiniMaxModel.classifyIntent('hello')

    expect(result.data).toHaveProperty('type')
    expect(result.tokens).toBeGreaterThan(0)
  }, 30000)

  it('should generate action from prompt as JSON', async () => {
    vi.doMock('@ai/constants/prompts', () => ({
      SEARCH_PROMPT: vi.fn().mockReturnValue(
        'You must respond with only valid JSON, no other text. Output: {"emotions":[],"objects":["car"],"faces":[],"limit":30}'
      ),
      ASSISTANT_MESSAGE_PROMPT: vi.fn(),
      VIDEO_COMPILATION_MESSAGE_PROMPT: vi.fn(),
      YEAR_IN_REVIEW: vi.fn(),
      GENERAL_RESPONSE_PROMPT: vi.fn(),
      CLASSIFY_INTENT_PROMPT: vi.fn(),
      ANALYTICS_RESPONSE_PROMPT: vi.fn(),
    }))

    const { MiniMaxModel } = await import('@ai/services/minimax')
    const result = await MiniMaxModel.generateActionFromPrompt('find cars in my videos')

    expect(result.error).toBeUndefined()
    expect(result.tokens).toBeGreaterThan(0)
  }, 30000)
})
