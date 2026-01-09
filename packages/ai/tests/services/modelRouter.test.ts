import { ChatMessage } from '@prisma/client'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { YearStats } from '@shared/types/stats'
import { VideoWithScenes } from '@shared/types/video'

const mockLocalModel = {
  generateActionFromPrompt: vi.fn(),
  generateAssistantMessage: vi.fn(),
  generateCompilationResponse: vi.fn(),
  generateGeneralResponse: vi.fn(),
  classifyIntent: vi.fn(),
  generateAnalyticsResponse: vi.fn(),
  generateYearInReviewResponse: vi.fn(),
  cleanUp: vi.fn(),
}

const mockGeminiModel = {
  generateActionFromPrompt: vi.fn(),
  generateAssistantMessage: vi.fn(),
  generateCompilationResponse: vi.fn(),
  generateGeneralResponse: vi.fn(),
  classifyIntent: vi.fn(),
  generateAnalyticsResponse: vi.fn(),
  generateYearInReviewResponse: vi.fn(),
  cleanUp: vi.fn(),
}

const mockOllamaModel = {
  generateActionFromPrompt: vi.fn(),
  generateAssistantMessage: vi.fn(),
  generateCompilationResponse: vi.fn(),
  generateGeneralResponse: vi.fn(),
  classifyIntent: vi.fn(),
  generateAnalyticsResponse: vi.fn(),
  generateYearInReviewResponse: vi.fn(),
  cleanUp: vi.fn(),
}
const mockLogger = {
  debug: vi.fn(),
  error: vi.fn(),
}

vi.mock('@ai/services/localLlm', () => ({
  LocalModel: mockLocalModel,
}))

vi.mock('@ai/services/gemini', () => ({
  GeminiModel: mockGeminiModel,
}))

vi.mock('@ai/services/logger', () => ({
  logger: mockLogger,
}))
vi.mock('@ai/services/ollama', () => ({
  OllamaModel: mockOllamaModel,
}))

const mockConstants: Record<string, string | null | boolean | number> = {
  USE_LOCAL: true,
  SEARCH_AI_MODEL: '/path/to/local/model',
  GEMINI_API_KEY: null,
  GEMINI_MODEL_NAME: 'gemini-pro',
  USE_GEMINI: false,
  OLLAMA_MODEL: null,
  USE_OLLAMA_MODEL: false,
}

vi.mock('@ai/constants', () => mockConstants)

const dummyHistory: ChatMessage[] = [
  {
    id: '1',
    sender: 'user',
    text: 'Hi',
    createdAt: new Date(),
    outputSceneIds: [],
    chatId: '1',
    stitchedVideoPath: null,
    updatedAt: new Date(),
    tokensUsed: BigInt(0),
    isError: false,
    exportId: null,
    isThinking: false,
    stage: 'understanding',
    intent: 'general',
  },
  {
    id: '2',
    sender: 'assistant',
    text: 'Hello!',
    createdAt: new Date(),
    outputSceneIds: [],
    chatId: '1',
    stitchedVideoPath: null,
    updatedAt: new Date(),
    tokensUsed: BigInt(0),
    isError: false,
    exportId: null,
    isThinking: false,
    stage: 'understanding',
    intent: 'general',
  },
]

describe('Model Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Model Selection', () => {
    it('should use LocalModel when USE_LOCAL and SEARCH_AI_MODEL are set', async () => {
      mockConstants.USE_LOCAL = true
      mockConstants.SEARCH_AI_MODEL = '/path/to/local/model'
      mockConstants.GEMINI_API_KEY = null

      vi.resetModules()
      const modelRouter = await import('@ai/services/modelRouter')

      await modelRouter.generateActionFromPrompt('test', dummyHistory)
      expect(mockLocalModel.generateActionFromPrompt).toHaveBeenCalledWith('test', dummyHistory)
    })

    it('should use GeminiModel when GEMINI_API_KEY and USE_GEMINI is set', async () => {
      mockConstants.USE_LOCAL = false
      mockConstants.SEARCH_AI_MODEL = null
      mockConstants.GEMINI_API_KEY = 'test-key'
      mockConstants.GEMINI_MODEL_NAME = 'gemini-pro'
      mockConstants.USE_GEMINI = true

      vi.resetModules()
      const modelRouter = await import('@ai/services/modelRouter')

      await modelRouter.generateActionFromPrompt('test', dummyHistory)
      expect(mockGeminiModel.generateActionFromPrompt).toHaveBeenCalledWith('test', dummyHistory)
    })

    it('should use Ollama when USE_OLLAMA_MODEL and OLLAMA_MODELis set', async () => {
      mockConstants.USE_LOCAL = false
      mockConstants.SEARCH_AI_MODEL = null
      mockConstants.GEMINI_API_KEY = null
      mockConstants.USE_GEMINI = false
      mockConstants.OLLAMA_MODEL = 'qwen2.5:7b-instruct'
      mockConstants.USE_OLLAMA_MODEL = true

      vi.resetModules()
      const modelRouter = await import('@ai/services/modelRouter')

      await modelRouter.generateActionFromPrompt('test', dummyHistory)
      expect(mockGeminiModel.generateActionFromPrompt).toHaveBeenCalledWith('test', dummyHistory)
    })

    it('should throw an error if no model is configured', async () => {
      mockConstants.USE_LOCAL = false
      mockConstants.SEARCH_AI_MODEL = null
      mockConstants.GEMINI_API_KEY = null

      vi.resetModules()

      await expect(import('@ai/services/modelRouter')).rejects.toThrow(
        'No valid AI backend found. Set USE_LOCAL + SEARCH_AI_MODEL or GEMINI_API_KEY.'
      )
    })
  })

  describe('Function Calls', () => {
    beforeEach(async () => {
      mockConstants.USE_LOCAL = true
      mockConstants.SEARCH_AI_MODEL = '/path/to/local/model'
      mockConstants.GEMINI_API_KEY = null
      vi.resetModules()
    })

    it('should call generateActionFromPrompt on the active model', async () => {
      const { generateActionFromPrompt } = await import('@ai/services/modelRouter')
      await generateActionFromPrompt('test query', dummyHistory)
      expect(mockLocalModel.generateActionFromPrompt).toHaveBeenCalledWith('test query', dummyHistory)
    })

    it('should call generateAssistantMessage on the active model', async () => {
      const { generateAssistantMessage } = await import('@ai/services/modelRouter')
      await generateAssistantMessage('test prompt', 5)
      expect(mockLocalModel.generateAssistantMessage).toHaveBeenCalledWith('test prompt', 5)
    })

    it('should call generateCompilationResponse on the active model', async () => {
      const { generateCompilationResponse } = await import('@ai/services/modelRouter')
      await generateCompilationResponse('test prompt', 3, dummyHistory)
      expect(mockLocalModel.generateCompilationResponse).toHaveBeenCalledWith('test prompt', 3, dummyHistory)
    })

    it('should call generateGeneralResponse on the active model', async () => {
      const { generateGeneralResponse } = await import('@ai/services/modelRouter')
      await generateGeneralResponse('test prompt', dummyHistory)
      expect(mockLocalModel.generateGeneralResponse).toHaveBeenCalledWith('test prompt', dummyHistory)
    })

    it('should call classifyIntent on the active model', async () => {
      const { classifyIntent } = await import('@ai/services/modelRouter')
      await classifyIntent('test prompt', dummyHistory)
      expect(mockLocalModel.classifyIntent).toHaveBeenCalledWith('test prompt', dummyHistory)
    })

    it('should call generateAnalyticsResponse on the active model', async () => {
      const { generateAnalyticsResponse } = await import('@ai/services/modelRouter')
      const analytics = { data: 'test' }
      await generateAnalyticsResponse('test prompt', analytics, dummyHistory)
      expect(mockLocalModel.generateAnalyticsResponse).toHaveBeenCalledWith('test prompt', analytics, dummyHistory)
    })

    it('should call generateYearInReviewResponse on the active model', async () => {
      const { generateYearInReviewResponse } = await import('@ai/services/modelRouter')
      const stats: YearStats = {
        totalVideos: 10,
        totalDuration: 100,
        totalScenes: 100,
        topEmotions: [],
        topFaces: [],
        topShotTypes: [],
        topObjects: [],
        categories: [],
        topWords: [],
        longestScene: { duration: 10, description: '', videoSource: 'testing.mp4' },
        shortestScene: { duration: 10, description: '', videoSource: 'testing.mp4' },
      }
      const videos: VideoWithScenes[] = []
      const extraDetails = 'some details'

      await generateYearInReviewResponse(stats, videos, extraDetails)
      expect(mockLocalModel.generateYearInReviewResponse).toHaveBeenCalledWith(stats, videos, extraDetails)
    })
  })
  it('should throw an error and re-throw when a function call fails', async () => {
    const error = new Error('Test error')
    mockLocalModel.generateActionFromPrompt.mockRejectedValueOnce(error)

    mockConstants.USE_LOCAL = true
    mockConstants.SEARCH_AI_MODEL = '/path/to/local/model'
    vi.resetModules()

    vi.mock('@ai/services/localLlm', () => ({
      LocalModel: mockLocalModel,
    }))

    const { generateActionFromPrompt } = await import('@ai/services/modelRouter')

    await expect(generateActionFromPrompt('test query', dummyHistory)).rejects.toBe(undefined)
  })
})
