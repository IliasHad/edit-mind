import { beforeEach, describe, expect, it, vi } from 'vitest'

const createMock = vi.fn()
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

const mockConstants = {
  OPENAI_LIKE_BASE_URL: 'http://user:pass@localhost:8080/v1?secret=value',
  OPENAI_LIKE_API_KEY: 'test-secret-key',
  OPENAI_LIKE_MODEL: 'local-model',
}

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(function MockOpenAI() {
    return {
      chat: {
        completions: {
          create: createMock,
        },
      },
    }
  }),
}))

vi.mock('@shared/services/logger', () => ({
  logger: mockLogger,
}))

vi.mock('@ai/constants', () => mockConstants)

describe('OpenAI-like model diagnostics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('logs sanitized client configuration without leaking credentials', async () => {
    createMock.mockResolvedValue({
      choices: [{ message: { content: 'hello' }, finish_reason: 'stop' }],
      usage: { total_tokens: 3 },
      _request_id: 'req_123',
    })

    const { OpenaiLikeModel } = await import('@ai/services/openaiLike')
    await OpenaiLikeModel.generateGeneralResponse('Say hello')

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'openai-like',
        model: 'local-model',
        baseURL: 'http://localhost:8080/v1',
        hasApiKey: true,
      }),
      'Initialized OpenAI-like client'
    )

    const loggedPayload = JSON.stringify(mockLogger.info.mock.calls)
    expect(loggedPayload).not.toContain('test-secret-key')
    expect(loggedPayload).not.toContain('user:pass')
    expect(loggedPayload).not.toContain('secret=value')
  })

  it('returns an error and logs diagnostics when chat completion content is empty', async () => {
    createMock.mockResolvedValue({
      choices: [{ message: { content: '' }, finish_reason: 'stop' }],
      usage: { total_tokens: 7 },
      _request_id: 'req_empty',
    })

    const { OpenaiLikeModel } = await import('@ai/services/openaiLike')
    const result = await OpenaiLikeModel.generateGeneralResponse('Say hello')

    expect(result).toEqual({
      data: '',
      tokens: 7,
      error: 'Empty response from OpenAI-like model',
    })
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'openai-like',
        operation: 'generateGeneralResponse',
        model: 'local-model',
        requestId: 'req_empty',
        choicesCount: 1,
        finishReason: 'stop',
        contentLength: 0,
      }),
      'OpenAI-like model returned empty content'
    )
  })

  it('logs safe API error details when chat completion throws', async () => {
    const apiError = Object.assign(new Error('response_format is not supported'), {
      name: 'BadRequestError',
      status: 400,
      code: 'bad_request',
      type: 'invalid_request_error',
      request_id: 'req_error',
      error: { message: 'response_format is not supported', secret: 'should-not-log' },
    })
    createMock.mockRejectedValue(apiError)

    const { OpenaiLikeModel } = await import('@ai/services/openaiLike')

    await expect(OpenaiLikeModel.generateGeneralResponse('Say hello')).rejects.toThrow('response_format is not supported')
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'openai-like',
        operation: 'generateGeneralResponse',
        model: 'local-model',
        status: 400,
        code: 'bad_request',
        type: 'invalid_request_error',
        requestId: 'req_error',
        message: 'response_format is not supported',
      }),
      'OpenAI-like chat completion failed'
    )

    const loggedPayload = JSON.stringify(mockLogger.error.mock.calls)
    expect(loggedPayload).not.toContain('should-not-log')
  })
})
