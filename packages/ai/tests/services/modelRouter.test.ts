import { ChatMessage } from '@prisma/client'
import { YearStats } from '@shared/types/stats'
import { VideoWithScenes } from '@shared/types/video'
import { describe, it, expect, vi, beforeEach } from 'vitest'

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
  GEMINI_API_KEY: null,
  GEMINI_MODEL_NAME: 'gemini-pro',
  USE_GEMINI: false,
  OLLAMA_MODEL: "qwen2.5:7b-instruct",
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
    it('should use GeminiModel when GEMINI_API_KEY and USE_GEMINI is set', async () => {
      mockConstants.GEMINI_API_KEY = 'test-key'
      mockConstants.GEMINI_MODEL_NAME = 'gemini-pro'
      mockConstants.USE_GEMINI = true

      vi.resetModules()
      const modelRouter = await import('@ai/services/modelRouter')

      await modelRouter.generateActionFromPrompt('test', dummyHistory)
      expect(mockGeminiModel.generateActionFromPrompt).toHaveBeenCalledWith('test', dummyHistory)
    })

    it('should use Ollama when USE_OLLAMA_MODEL and OLLAMA_MODELis set', async () => {
      mockConstants.GEMINI_API_KEY = null
      mockConstants.USE_GEMINI = false
      mockConstants.OLLAMA_MODEL = '/name/of/model'
      mockConstants.USE_OLLAMA_MODEL = true

      vi.resetModules()
      const modelRouter = await import('@ai/services/modelRouter')

      await modelRouter.generateActionFromPrompt('test', dummyHistory)
      expect(mockOllamaModel.generateActionFromPrompt).toHaveBeenCalledWith('test', dummyHistory)
    })
  })
  describe('Function Calls', () => {
    beforeEach(async () => {
      mockConstants.USE_OLLAMA_MODEL = true
      mockConstants.OLLAMA_MODEL = '/name/of/model'
      vi.resetModules()
    })

    it('should call generateActionFromPrompt on the active model', async () => {
      const { generateActionFromPrompt } = await import('@ai/services/modelRouter')
      await generateActionFromPrompt('test query', dummyHistory)
      expect(mockOllamaModel.generateActionFromPrompt).toHaveBeenCalledWith('test query', dummyHistory)
    })

    it('should call generateAssistantMessage on the active model', async () => {
      const { generateAssistantMessage } = await import('@ai/services/modelRouter')
      await generateAssistantMessage('test prompt', 5)
      expect(mockOllamaModel.generateAssistantMessage).toHaveBeenCalledWith('test prompt', 5)
    })

    it('should call generateCompilationResponse on the active model', async () => {
      const { generateCompilationResponse } = await import('@ai/services/modelRouter')
      await generateCompilationResponse('test prompt', 3, dummyHistory)
      expect(mockOllamaModel.generateCompilationResponse).toHaveBeenCalledWith('test prompt', 3, dummyHistory)
    })

    it('should call generateGeneralResponse on the active model', async () => {
      const { generateGeneralResponse } = await import('@ai/services/modelRouter')
      await generateGeneralResponse('test prompt', dummyHistory)
      expect(mockOllamaModel.generateGeneralResponse).toHaveBeenCalledWith('test prompt', dummyHistory)
    })

    it('should call classifyIntent on the active model', async () => {
      const { classifyIntent } = await import('@ai/services/modelRouter')
      await classifyIntent('test prompt', dummyHistory)
      expect(mockOllamaModel.classifyIntent).toHaveBeenCalledWith('test prompt', dummyHistory)
    })

    it('should call generateAnalyticsResponse on the active model', async () => {
      const { generateAnalyticsResponse } = await import('@ai/services/modelRouter')
      const analytics = {
        totalDuration: 12847,
        totalDurationFormatted: "3h 34m 7s",

        uniqueVideos: 42,
        totalScenes: 318,

        dateRange: {
          oldest: new Date("2024-01-12T10:15:00Z"),
          newest: new Date("2024-03-28T18:42:00Z"),
        },

        emotionCounts: {
          happy: 124,
          neutral: 96,
          surprised: 41,
          sad: 22,
          angry: 15,
          fearful: 11,
          disgusted: 9,
        },

        faceOccurrences: {
          "John Doe": 87,
          "Sarah Smith": 65
        },

        objectsOccurrences: {
          "car": 58,
          "laptop": 44,
          "phone": 73,
          "microphone": 29,
          "bicycle": 17,
          "dog": 12,
        },

        averageSceneDuration: 2.5,
      }
      await generateAnalyticsResponse('test prompt', analytics, dummyHistory)
      expect(mockOllamaModel.generateAnalyticsResponse).toHaveBeenCalledWith('test prompt', analytics, dummyHistory)
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
      expect(mockOllamaModel.generateYearInReviewResponse).toHaveBeenCalledWith(stats, videos, extraDetails)
    })
  })
})
