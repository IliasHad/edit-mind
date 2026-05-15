import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockGenerateGeneralResponse = vi.fn()
const mockLogger = {
  warn: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}

vi.mock('@ai/services/modelRouter', () => ({
  generateGeneralResponse: mockGenerateGeneralResponse,
}))

vi.mock('@shared/services/logger', () => ({
  logger: mockLogger,
}))

vi.mock('@chat/handlers', () => ({
  handleAnalyticsIntent: vi.fn(),
  handleCompilationIntent: vi.fn(),
  handleRefinementIntent: vi.fn(),
  handleSimilarityIntent: vi.fn(),
}))

describe('processIntent diagnostics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('logs model error details before using the generic empty-response fallback', async () => {
    mockGenerateGeneralResponse.mockResolvedValue({
      data: '',
      tokens: 12,
      error: 'Empty response from OpenAI-like model',
    })

    const { processIntent } = await import('@chat/services/processor')
    const result = await processIntent({
      intent: { type: 'general', needsVideoData: false, keepPrevious: false },
      prompt: 'hello local model',
      recentMessages: [],
      newMessage: { id: 'assistant-message-id' } as never,
    })

    expect(result).toEqual({
      assistantText: 'Sorry, I could not generate a response.',
      outputSceneIds: [],
      tokensUsed: 12,
    })
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        intentType: 'general',
        responseError: 'Empty response from OpenAI-like model',
        tokens: 12,
        promptLength: 17,
        recentMessagesCount: 0,
      }),
      'Using generic chat fallback because model returned no data'
    )
  })
})
