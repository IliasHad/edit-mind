import { describe, it, expect, afterEach } from 'vitest'
import {
  cleanup,
  generateAssistantMessage,
  generateCompilationResponse,
  generateGeneralResponse,
  classifyIntent,
  generateAnalyticsResponse,
  generateActionFromPrompt,
  generateYearInReviewResponse,
} from '@ai/services/modelRouter'
import { TEST_QUERIES, compareResults } from '../helpers/llm'
import { ChatMessage } from '@prisma/client'
import { YearStats } from '@shared/types/stats'
import { VideoWithScenes } from '@shared/types/video'
import { Scene } from '@shared/schemas'

const TEST_TIMEOUT = 120000
const EXTENDED_TIMEOUT = 180000

afterEach(async () => {
  await cleanup()
})
const mockScene = (overrides?: Partial<Scene>): Scene => ({
  id: `scene-${Date.now()}-${Math.random()}`,
  source: 'test-video.mp4',
  startTime: 0,
  endTime: 5,
  duration: 5,
  description: 'A test scene with a person smiling',
  faces: ['person1'],
  objects: ['laptop', 'desk'],
  emotions: [{ emotion: 'happy', name: 'person1' }],
  transcription: 'Hello world, this is a test',
  detectedText: ['lorem ipsum'],
  shot_type: 'medium-shot',
  aspect_ratio: '16:9',
  camera: 'static',
  category: 'test',
  createdAt: new Date().getTime(),
  dominantColorName: 'black',
  dominantColorHex: '#000',
  location: '',
  ...overrides,
})

describe('LLM Service', () => {
  describe('Model Initialization & Lifecycle', () => {
    it(
      'initializes model successfully',
      async () => {
        const result = await generateActionFromPrompt('test query')
        expect(result).toBeDefined()
        expect(result.data.description).toBeTruthy()
      },
      TEST_TIMEOUT
    )

    it(
      'handles cleanup without errors',
      async () => {
        await generateActionFromPrompt('test')
        await expect(cleanup()).resolves.not.toThrow()
      },
      TEST_TIMEOUT
    )

    it(
      'reinitializes after cleanup',
      async () => {
        await generateActionFromPrompt('first query')
        await cleanup()
        const result = await generateActionFromPrompt('second query')
        expect(result).toBeDefined()
      },
      EXTENDED_TIMEOUT
    )
  })

  describe('Video Search Parameter Generation', () => {
    it(
      'parses simple queries',
      async () => {
        const result = await generateActionFromPrompt(TEST_QUERIES.simple.query)
        compareResults(result.data, TEST_QUERIES.simple.expected)
      },
      TEST_TIMEOUT
    )

    it(
      'handles complex multi-parameter queries',
      async () => {
        const result = await generateActionFromPrompt(TEST_QUERIES.complex.query)
        compareResults(result.data, TEST_QUERIES.complex.expected)
      },
      TEST_TIMEOUT
    )

    it(
      'extracts transcription requirements',
      async () => {
        const result = await generateActionFromPrompt(TEST_QUERIES.transcription.query)
        compareResults(result.data, TEST_QUERIES.transcription.expected)
      },
      TEST_TIMEOUT
    )

    it(
      'identifies objects in scenes',
      async () => {
        const result = await generateActionFromPrompt(TEST_QUERIES.withObjects.query)
        compareResults(result.data, TEST_QUERIES.withObjects.expected)
      },
      TEST_TIMEOUT
    )

    it(
      'parses multiple emotions',
      async () => {
        const result = await generateActionFromPrompt(TEST_QUERIES.multiEmotion.query)
        compareResults(result.data, TEST_QUERIES.multiEmotion.expected)
      },
      TEST_TIMEOUT
    )

    it(
      'detects aspect ratio requirements',
      async () => {
        const result = await generateActionFromPrompt(TEST_QUERIES.aspectRatio.query)
        compareResults(result.data, TEST_QUERIES.aspectRatio.expected)
      },
      TEST_TIMEOUT
    )

    it(
      'detects shot type requirements',
      async () => {
        const result = await generateActionFromPrompt(TEST_QUERIES.shotType.query)
        compareResults(result.data, TEST_QUERIES.shotType.expected)
      },
      TEST_TIMEOUT
    )
  })

  describe('Advanced Query Parsing', () => {
    it(
      'handles duration specifications',
      async () => {
        const result = await generateActionFromPrompt('Create a 45 second video')
        expect(result.data.duration).toBe(45)
      },
      TEST_TIMEOUT
    )

    it(
      'parses camera movement queries',
      async () => {
        const result = await generateActionFromPrompt('Show me videos with static camera')
        expect(result).toBeDefined()
      },
      TEST_TIMEOUT
    )

    it(
      'handles combined constraints',
      async () => {
        const query = 'Create a 30 second vertical video of happy people with laptops in close-up'
        const result = await generateActionFromPrompt(query)

        expect(result.data.duration).toBe(30)
        expect(result.data.aspect_ratio).toBe('9:16')
        expect(result.data.emotions).toContain('happy')
        expect(result.data.objects).toContain('laptop')
        expect(result.data.shot_type).toBe('close-up')
      },
      TEST_TIMEOUT
    )

    it(
      'handles edge case durations',
      async () => {
        const testCases = [
          { query: 'Create a 1 second video', expected: 1 },
          { query: 'Make a 5 minute compilation', expected: 300 },
          { query: 'Show me 2.5 minute clips', expected: 150 },
        ]

        for (const { query, expected } of testCases) {
          const result = await generateActionFromPrompt(query)
          expect(result.data.duration).toBe(expected)
        }
      },
      EXTENDED_TIMEOUT
    )
  })
  describe('Intent Classification', () => {
    it(
      'classifies compilation requests',
      async () => {
        const result = await classifyIntent('Create a video compilation of my vacation')
        expect(result.data.type).toBe('compilation')
        expect(result.data.needsVideoData).toBe(true)
      },
      TEST_TIMEOUT
    )
    it(
      'classifies analytics requests',
      async () => {
        const result = await classifyIntent('How many videos do I have?')
        expect(result.data.type).toBe('analytics')
      },
      TEST_TIMEOUT
    )

    it(
      'classifies general conversation',
      async () => {
        const result = await classifyIntent('What can you help me with?')
        expect(result.data.type).toBe('general')
        expect(result.data.needsVideoData).toBe(false)
      },
      TEST_TIMEOUT
    )

    it(
      'handles ambiguous queries',
      async () => {
        const result = await classifyIntent('Show me')
        expect(result).toBeDefined()
        expect(['compilation', 'analytics', 'general']).toContain(result.data.type)
      },
      TEST_TIMEOUT
    )
  })
  describe('Response Generation', () => {
    it(
      'generates assistant messages',
      async () => {
        const message = await generateAssistantMessage('Show me happy videos', 10)
        expect(typeof message.data).toBe('string')
        expect(message.data.length).toBeGreaterThan(0)
        expect(message.data).toContain('10')
      },
      TEST_TIMEOUT
    )

    it(
      'generates compilation responses',
      async () => {
        const response = await generateCompilationResponse('Create vacation video', 5)

        expect(typeof response.data).toBe('string')
        expect(response.data.length).toBeGreaterThan(0)
      },
      TEST_TIMEOUT
    )

    it(
      'generates general responses',
      async () => {
        const response = await generateGeneralResponse('Hello')

        expect(typeof response.data).toBe('string')
        expect(response.data.length).toBeGreaterThan(0)
      },
      TEST_TIMEOUT
    )

    it(
      'includes chat history in context',
      async () => {
        const history: ChatMessage[] = [
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
          },
        ]

        const response = await generateGeneralResponse('What did I just say?', history)
        expect(typeof response.data).toBe('string')
      },
      TEST_TIMEOUT
    )

    it(
      'handles empty results gracefully',
      async () => {
        const response = await generateAssistantMessage('Find impossible content', 0)
        expect(typeof response.data).toBe('string')
        expect(response.data.length).toBeGreaterThan(0)
      },
      TEST_TIMEOUT
    )
  })

  describe('Error Handling & Resilience', () => {
    it(
      'handles empty queries',
      async () => {
        const result = await generateActionFromPrompt('')
        expect(result.data).toBeDefined()
        expect(result.data.description).toBeTruthy()
      },
      TEST_TIMEOUT
    )

    it(
      'handles very long queries',
      async () => {
        const longQuery = 'Show me videos with ' + 'happy people '.repeat(50)
        const result = await generateActionFromPrompt(longQuery)

        expect(result.data).toBeDefined()
      },
      TEST_TIMEOUT
    )

    it(
      'handles special characters in queries',
      async () => {
        const specialQuery = 'Create video with @#$%^&*() characters!'
        const result = await generateActionFromPrompt(specialQuery)

        expect(result.data).toBeDefined()
      },
      TEST_TIMEOUT
    )

    it(
      'handles unicode in queries',
      async () => {
        const unicodeQuery = 'Créer une vidéo с русским текстом 和中文'
        const result = await generateActionFromPrompt(unicodeQuery)

        expect(result.data).toBeDefined()
      },
      TEST_TIMEOUT
    )

    it(
      'provides fallback for unparseable responses',
      async () => {
        const result = await generateActionFromPrompt('xyz123abc')

        expect(result.data).toBeDefined()
        expect(result.data.description).toBeTruthy()
      },
      TEST_TIMEOUT
    )

    it(
      'handles malformed JSON in model output',
      async () => {
        const result = await generateActionFromPrompt('test malformed')

        expect(result.data).toMatchObject({
          description: expect.any(String),
          aspect_ratio: expect.any(String),
        })
      },
      TEST_TIMEOUT
    )

    it(
      'handles concurrent requests',
      async () => {
        const queries = Array.from({ length: 5 }, (_, i) => `Query ${i}`)

        const results = await Promise.all(queries.map((q) => generateActionFromPrompt(q)))

        expect(results).toHaveLength(5)
        results.forEach((result) => {
          expect(result).toBeDefined()
          expect(result.data.description).toBeDefined()
        })
      },
      EXTENDED_TIMEOUT
    )
  })
  describe('Schema Validation', () => {
    it(
      'validates all required fields',
      async () => {
        const result = await generateActionFromPrompt('Create a test video')
        expect(result.data).toMatchObject({
          emotions: expect.any(Array),
          shot_type: expect.toBeOneOf([expect.any(String), null]),
          aspect_ratio: expect.any(String),
          duration: expect.toBeOneOf([expect.any(Number), null]),
          description: expect.any(String),
          objects: expect.any(Array),
          transcriptionQuery: expect.toBeOneOf([expect.any(String), null]),
        })
      },
      TEST_TIMEOUT
    )

    it(
      'validates enum values for shot_type',
      async () => {
        const validTypes = ['medium-shot', 'long-shot', 'close-up', null]
        const result = await generateActionFromPrompt('Show me close-up shots')

        expect(validTypes).toContain(result.data.shot_type)
      },
      TEST_TIMEOUT
    )

    it(
      'validates enum values for aspect_ratio',
      async () => {
        const validRatios = ['16:9', '9:16', '1:1', '4:3', '8:7', null]
        const result = await generateActionFromPrompt('Create a square video')

        expect(validRatios).toContain(result.data.aspect_ratio)
      },
      TEST_TIMEOUT
    )

    it(
      'validates positive duration values',
      async () => {
        const result = await generateActionFromPrompt('Create a 30 second video')

        if (result.data.duration !== null) {
          expect(result.data.duration).toBeGreaterThan(0)
        }
      },
      TEST_TIMEOUT
    )

    describe('Duration Edge Cases - Extended', () => {
      it(
        'handles various time unit formats',
        async () => {
          const testCases = [
            { query: 'Create a 30s video', expected: 30 },
            { query: 'Create a 45 sec video', expected: 45 },
            { query: 'Make a 1m video', expected: 60 },
            { query: 'Make a 2min video', expected: 120 },
            { query: 'Create 10 minutes compilation', expected: 600 },
            { query: 'Show 0.5 minute clips', expected: 30 },
            { query: '1.5 min video', expected: 90 },
            { query: '3.5 minutes compilation', expected: 210 },
          ]

          for (const { query, expected } of testCases) {
            const result = await generateActionFromPrompt(query)
            expect(result.data.duration, `Failed for: "${query}"`).toBe(expected)
          }
        },
        EXTENDED_TIMEOUT
      )

      it(
        'handles large durations',
        async () => {
          const testCases = [
            { query: 'Create a 10 minute video', expected: 600 },
            { query: 'Make a 30 minute compilation', expected: 1800 },
            { query: 'Show me 1 hour of footage', expected: 3600 },
          ]

          for (const { query, expected } of testCases) {
            const result = await generateActionFromPrompt(query)
            expect(result.data.duration).toBe(expected)
          }
        },
        TEST_TIMEOUT
      )

      it(
        'ignores invalid duration formats',
        async () => {
          const queries = ['video lasting forever', 'quick video', 'short clip', 'brief moment']

          for (const query of queries) {
            const result = await generateActionFromPrompt(query)
            expect(result.data.duration).toBeNull()
          }
        },
        TEST_TIMEOUT
      )
    })

    describe('Aspect Ratio Variations', () => {
      it(
        'detects vertical format keywords',
        async () => {
          const queries = [
            'vertical video',
            'portrait mode',
            'TikTok format',
            'Instagram Stories style',
            'Reels format',
            '9:16 ratio',
          ]

          for (const query of queries) {
            const result = await generateActionFromPrompt(query)
            expect(result.data.aspect_ratio, `Failed for: "${query}"`).toBe('9:16')
          }
        },
        EXTENDED_TIMEOUT
      )

      it(
        'detects square format keywords',
        async () => {
          const queries = ['square video', '1:1 format', 'Instagram post', 'square aspect ratio']

          for (const query of queries) {
            const result = await generateActionFromPrompt(query)
            expect(result.data.aspect_ratio, `Failed for: "${query}"`).toBe('1:1')
          }
        },
        TEST_TIMEOUT
      )

      it(
        'defaults to 16:9 when unspecified',
        async () => {
          const queries = ['happy videos', 'compilation of clips', 'show me scenes']

          for (const query of queries) {
            const result = await generateActionFromPrompt(query)
            expect(result.data.aspect_ratio).toBe('16:9')
          }
        },
        TEST_TIMEOUT
      )
    })

    describe('Shot Type Detection - Comprehensive', () => {
      it(
        'detects close-up variations',
        async () => {
          const queries = ['close-up shots', 'closeup videos', 'close up scenes', 'tight shots', 'facial close-ups']

          for (const query of queries) {
            const result = await generateActionFromPrompt(query)
            expect(result.data.shot_type, `Failed for: "${query}"`).toBe('close-up')
          }
        },
        EXTENDED_TIMEOUT
      )

      it(
        'detects medium shot variations',
        async () => {
          const queries = ['medium shot', 'medium-shot videos', 'waist up shots', 'mid-shot compilation']

          for (const query of queries) {
            const result = await generateActionFromPrompt(query)
            expect(result.data.shot_type, `Failed for: "${query}"`).toBe('medium-shot')
          }
        },
        TEST_TIMEOUT
      )

      it(
        'detects long shot variations',
        async () => {
          const queries = [
            'long shot videos',
            'long-shot compilation',
            'wide shots',
            'full body shots',
            'establishing shots',
          ]

          for (const query of queries) {
            const result = await generateActionFromPrompt(query)
            expect(result.data.shot_type, `Failed for: "${query}"`).toBe('long-shot')
          }
        },
        EXTENDED_TIMEOUT
      )
    })

    describe('Emotion Detection', () => {
      it(
        'detects all common emotions',
        async () => {
          const emotionTests = [
            { query: 'happy moments', emotion: 'happy' },
            { query: 'sad scenes', emotion: 'sad' },
            { query: 'angry reactions', emotion: 'angry' },
            { query: 'surprised expressions', emotion: 'surprised' },
            { query: 'excited clips', emotion: 'excited' },
            { query: 'neutral faces', emotion: 'neutral' },
            { query: 'fearful moments', emotion: 'fearful' },
            { query: 'disgusted reactions', emotion: 'disgusted' },
          ]

          for (const { query, emotion } of emotionTests) {
            const result = await generateActionFromPrompt(query)
            expect(result.data.emotions, `Failed for: "${query}"`).toContain(emotion)
          }
        },
        EXTENDED_TIMEOUT
      )

      it(
        'handles emotion synonyms',
        async () => {
          const testCases = [
            { query: 'joyful moments', expectedEmotion: 'happy' },
            { query: 'cheerful videos', expectedEmotion: 'happy' },
            { query: 'upset scenes', expectedEmotion: 'sad' },
            { query: 'thrilled reactions', expectedEmotion: 'excited' },
          ]

          for (const { query, expectedEmotion } of testCases) {
            const result = await generateActionFromPrompt(query)
            expect(result.data.emotions, `Failed for: "${query}"`).toContain(expectedEmotion)
          }
        },
        TEST_TIMEOUT
      )

      it(
        'extracts multiple emotions from complex queries',
        async () => {
          const result = await generateActionFromPrompt('Show me happy, excited, and surprised reactions')

          expect(result.data.emotions).toContain('happy')
          expect(result.data.emotions).toContain('excited')
          expect(result.data.emotions).toContain('surprised')
        },
        TEST_TIMEOUT
      )

      it(
        'handles emotion phrases',
        async () => {
          const testCases = [
            { query: 'people laughing', expectedEmotion: 'happy' },
            { query: 'crying moments', expectedEmotion: 'sad' },
            { query: 'screaming in fear', expectedEmotion: 'fearful' },
          ]

          for (const { query, expectedEmotion } of testCases) {
            const result = await generateActionFromPrompt(query)
            expect(result.data.emotions).toContain(expectedEmotion)
          }
        },
        TEST_TIMEOUT
      )
    })

    describe('Object Detection', () => {
      it(
        'detects common objects',
        async () => {
          const objectTests = [
            { query: 'videos with laptops', object: 'laptop' },
            { query: 'clips with phones', object: 'phone' },
            { query: 'scenes with cars', object: 'car' },
            { query: 'footage with dogs', object: 'dog' },
            { query: 'videos with cats', object: 'cat' },
            { query: 'clips with books', object: 'book' },
          ]

          for (const { query, object } of objectTests) {
            const result = await generateActionFromPrompt(query)
            expect(result.data.objects, `Failed for: "${query}"`).toContain(object)
          }
        },
        EXTENDED_TIMEOUT
      )

      it('handles plural forms', async () => {
        const testCases = [
          { query: 'videos with multiple laptops', objects: ['laptop'] },
          { query: 'scenes with dogs and cats', objects: ['dog', 'cat'] },
          { query: 'clips with phones and tablets', objects: ['phone', 'tablet'] },
        ]

        for (const { query, objects } of testCases) {
          const result = await generateActionFromPrompt(query)
          expect(result.data.objects).toEqual(expect.arrayContaining(objects))
        }
      })

      it(
        'detects objects in context',
        async () => {
          const result = await generateActionFromPrompt('cooking videos with pans, knives, and cutting boards')

          expect(result.data.objects.length).toBeGreaterThan(0)
          expect(result.data.objects).toEqual(expect.arrayContaining([expect.stringMatching(/pan|knife|board/i)]))
        },
        TEST_TIMEOUT
      )
    })

    describe('Face/Person Detection', () => {
      it(
        'extracts single @mentions',
        async () => {
          const testCases = [
            { query: 'videos with @John', expected: ['john'] },
            { query: 'clips of @Sarah', expected: ['sarah'] },
            { query: '@Mike talking', expected: ['mike'] },
          ]

          for (const { query, expected } of testCases) {
            const result = await generateActionFromPrompt(query)
            expect(result.data.faces, `Failed for: "${query}"`).toEqual(expected)
          }
        },
        TEST_TIMEOUT
      )

      it(
        'extracts multiple @mentions',
        async () => {
          const result = await generateActionFromPrompt('@Alice and @Bob together')

          expect(result.data.faces).toContain('alice')
          expect(result.data.faces).toContain('bob')
        },
        TEST_TIMEOUT
      )

      it(
        'normalizes case for @mentions',
        async () => {
          const queries = ['videos with @JOHN', 'clips of @John', 'scenes with @john']

          for (const query of queries) {
            const result = await generateActionFromPrompt(query)
            expect(result.data.faces).toContain('john')
          }
        },
        TEST_TIMEOUT
      )
    })

    describe('Transcription Query Extraction', () => {
      it(
        'extracts single quoted phrases',
        async () => {
          const testCases = [
            { query: "where I say 'hello world'", expected: 'hello world' },
            { query: 'clips saying "thank you"', expected: 'thank you' },
            { query: "when I said 'good morning'", expected: 'good morning' },
          ]

          for (const { query, expected } of testCases) {
            const result = await generateActionFromPrompt(query)
            expect(result.data.transcriptionQuery?.toLowerCase()).toContain(expected.toLowerCase())
          }
        },
        TEST_TIMEOUT
      )

      it(
        'handles multi-word phrases',
        async () => {
          const result = await generateActionFromPrompt(
            "Show clips where I say 'machine learning is awesome and powerful'"
          )

          expect(result.data.transcriptionQuery?.toLowerCase()).toContain('machine learning')
        },
        TEST_TIMEOUT
      )

      it(
        'returns null when no transcription query',
        async () => {
          const queries = ['happy videos', 'compilation of clips', 'show me scenes with dogs']

          for (const query of queries) {
            const result = await generateActionFromPrompt(query)
            expect(result.data.transcriptionQuery).toBeNull()
          }
        },
        TEST_TIMEOUT
      )
    })

    describe('Complex Multi-Parameter Queries', () => {
      it(
        'handles 6+ parameters simultaneously',
        async () => {
          const query =
            'Create a 60 second vertical close-up video of @Maria looking happy and excited with a laptop and coffee cup while talking'
          const result = await generateActionFromPrompt(query)

          expect(result.data.duration).toBe(60)
          expect(result.data.aspect_ratio).toBe('9:16')
          expect(result.data.shot_type).toBe('close-up')
          expect(result.data.faces).toContain('maria')
          expect(result.data.emotions).toEqual(expect.arrayContaining(['happy']))
          expect(result.data.objects.length).toBeGreaterThan(0)
          if (result.data.action) {
            expect(result.data.action).toMatch(/talk/i)
          }
        },
        TEST_TIMEOUT
      )

      it(
        'prioritizes primary constraints in conflicts',
        async () => {
          const result = await generateActionFromPrompt('vertical horizontal video')

          // Should choose one valid ratio
          expect(['9:16', '16:9']).toContain(result.data.aspect_ratio)
        },
        TEST_TIMEOUT
      )

      it(
        'handles mixed natural language',
        async () => {
          const result = await generateActionFromPrompt(
            'I want a quick 30s clip showing @John being super happy with his new laptop in a tight shot'
          )

          expect(result.data.duration).toBe(30)
          expect(result.data.faces).toContain('john')
          expect(result.data.emotions).toContain('happy')
          expect(result.data.objects).toContain('laptop')
          expect(result.data.shot_type).toBe('close-up')
        },
        TEST_TIMEOUT
      )
    })

    describe('Boundary and Edge Conditions', () => {
      it(
        'handles minimum values',
        async () => {
          const result = await generateActionFromPrompt('1 second video')
          expect(result.data.duration).toBe(1)
        },
        TEST_TIMEOUT
      )

      it(
        'handles fractional durations correctly',
        async () => {
          const testCases = [
            { query: '0.5 minute video', expected: 30 },
            { query: '1.25 minute clip', expected: 75 },
            { query: '2.75 minutes', expected: 165 },
          ]

          for (const { query, expected } of testCases) {
            const result = await generateActionFromPrompt(query)
            expect(result.data.duration).toBe(expected)
          }
        },
        TEST_TIMEOUT
      )

      it(
        'handles queries with excessive punctuation',
        async () => {
          const result = await generateActionFromPrompt('happy!!! videos!!!')
          expect(result.data.emotions).toContain('happy')
        },
        TEST_TIMEOUT
      )

      it(
        'handles queries with mixed capitalization',
        async () => {
          const result = await generateActionFromPrompt('HaPPy VeRTiCaL ViDeOs')
          expect(result.data.emotions).toContain('happy')
          expect(result.data.aspect_ratio).toBe('9:16')
        },
        TEST_TIMEOUT
      )
    })

    describe('Natural Language Variations', () => {
      it(
        'handles colloquial expressions',
        async () => {
          const testCases = [
            { query: 'gimme happy vids', emotion: 'happy' },
            { query: 'show me some cool clips', expected: 'defined' },
            { query: 'get me vertical stuff', aspectRatio: '9:16' },
          ]

          for (const test of testCases) {
            const result = await generateActionFromPrompt(test.query)
            if ('emotion' in test) {
              expect(result.data.emotions).toContain(test.emotion)
            }
            if ('aspectRatio' in test) {
              expect(result.data.aspect_ratio).toBe(test.aspectRatio)
            }
          }
        },
        TEST_TIMEOUT
      )

      it(
        'handles different sentence structures',
        async () => {
          const queries = [
            'I need happy videos',
            'Can you show me happy videos?',
            'Happy videos please',
            'Videos that are happy',
          ]

          for (const query of queries) {
            const result = await generateActionFromPrompt(query)
            expect(result.data.emotions).toContain('happy')
          }
        },
        TEST_TIMEOUT
      )

      it(
        'handles implicit requirements',
        async () => {
          const result = await generateActionFromPrompt('TikTok compilation of my dog')

          expect(result.data.aspect_ratio).toBe('9:16') // TikTok implies vertical
          expect(result.data.objects).toContain('dog')
        },
        TEST_TIMEOUT
      )
    })

    describe('Malformed and Stress Tests', () => {
      it(
        'handles queries with only numbers',
        async () => {
          const result = await generateActionFromPrompt('123 456 789')
          expect(result).toBeDefined()
          expect(result.data.description).toBeDefined()
        },
        TEST_TIMEOUT
      )

      it(
        'handles queries with only special characters',
        async () => {
          const result = await generateActionFromPrompt('!@#$%^&*()')
          expect(result).toBeDefined()
          expect(result.data.description).toBeDefined()
        },
        TEST_TIMEOUT
      )

      it(
        'handles repeated words',
        async () => {
          const result = await generateActionFromPrompt('happy happy happy happy videos')
          expect(result.data.emotions).toContain('happy')
        },
        TEST_TIMEOUT
      )

      it(
        'handles extremely short queries',
        async () => {
          const queries = ['hi', 'ok', 'yes', 'no']

          for (const query of queries) {
            const result = await generateActionFromPrompt(query)
            expect(result).toBeDefined()
          }
        },
        TEST_TIMEOUT
      )

      it(
        'handles queries with URLs',
        async () => {
          const result = await generateActionFromPrompt('happy videos http://example.com')
          expect(result.data.emotions).toContain('happy')
        },
        TEST_TIMEOUT
      )

      it(
        'handles queries with email addresses',
        async () => {
          const result = await generateActionFromPrompt('videos with john@example.com')
          expect(result).toBeDefined()
        },
        TEST_TIMEOUT
      )
    })

    describe('Response Generation', () => {
      it(
        'generates different responses for similar queries',
        async () => {
          const responses = await Promise.all([
            generateAssistantMessage('Show me videos', 10),
            generateAssistantMessage('Display clips', 10),
            generateAssistantMessage('Find footage', 10),
          ])

          responses.forEach((r) => expect(typeof r.data).toBe('string'))

          responses.forEach((r) => expect(r.data).toContain('10'))
        },
        TEST_TIMEOUT
      )

      it(
        'handles large counts',
        async () => {
          const response = await generateAssistantMessage('Show all videos', 1000)

          expect(typeof response.data).toBe('string')
          expect(response.data).toMatch(/1000|thousand/)
        },
        TEST_TIMEOUT
      )

      it(
        'generates year in review response',
        async () => {
          const stats: YearStats = {
            totalVideos: 247,
            totalScenes: 1834,
            totalDuration: 18420,
            topEmotions: [
              { emotion: 'happy', count: 456 },
              { emotion: 'surprised', count: 287 },
              { emotion: 'neutral', count: 234 },
              { emotion: 'excited', count: 189 },
              { emotion: 'sad', count: 92 },
            ],
            topObjects: [
              { name: 'laptop', count: 312 },
              { name: 'phone', count: 245 },
              { name: 'coffee', count: 178 },
              { name: 'dog', count: 156 },
              { name: 'car', count: 134 },
              { name: 'book', count: 98 },
            ],
            topFaces: [
              { name: 'ilias', count: 523 },
              { name: 'john', count: 289 },
              { name: 'sarah', count: 167 },
              { name: 'alex', count: 145 },
            ],
            topShotTypes: [
              { name: 'close-up', count: 678 },
              { name: 'medium-shot', count: 542 },
              { name: 'long-shot', count: 398 },
            ],
            topWords: [
              { word: 'hey', count: 678 },
              { word: 'welcome', count: 542 },
              { word: 'testing', count: 398 },
            ],
            categories: [
              { name: 'work', count: 89 },
              { name: 'personal', count: 67 },
              { name: 'travel', count: 45 },
              { name: 'family', count: 32 },
              { name: 'hobbies', count: 14 },
            ],

            longestScene: {
              duration: 145.8,
              description: 'Detailed presentation of quarterly results with multiple charts and data visualizations',
              videoSource: 'meeting_2024_q4.mp4',
            },
            shortestScene: {
              duration: 0.8,
              description: 'Quick transition shot of office hallway',
              videoSource: 'office_tour.mp4',
            },
          }

          const testScene = mockScene({
            id: `scene-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            source: `update-video-${Date.now()}.mp4`,
            description: 'Original description',
            faces: ['person1'],
          })
          const videos: VideoWithScenes[] = [
            {
              source: 'trip_to_paris.mp4',
              thumbnailUrl: '/path/to/trip_to_paris.mp4',
              sceneCount: 1,
              scenes: [testScene],
              duration: 1,
              camera: 'GoPro',
              faces: ['person1'],
              objects: ['laptop', 'desk'],
              emotions: ['happy'],
              shotTypes: ['medium-shot'],
              aspect_ratio: '16:9',
              category: 'test',
              createdAt: new Date().getTime(),
              dominantColorName: 'black',
              dominantColorHex: '#000',
              locationName: '',
            },
          ]
          const extraDetails = 'This is a test year in review.'

          const response = await generateYearInReviewResponse(stats, videos, extraDetails)

          expect(response).toBeDefined()
          expect(response.data).toBeDefined()
          expect(response.data?.slides).toBeDefined()
          expect(response.data?.topScenes).toBeDefined()
        },
        EXTENDED_TIMEOUT
      )
    })
    describe('Intent Classification - Extended', () => {
      it(
        'classifies search requests',
        async () => {
          const queries = ['find happy videos', 'search for clips with dogs', 'show me vertical videos']

          for (const query of queries) {
            const result = await classifyIntent(query)
            expect(result.data.type).toBe('compilation')
          }
        },
        TEST_TIMEOUT
      )

      it(
        'classifies question-based analytics',
        async () => {
          const queries = [
            'What emotions are most common?',
            'Who appears most in my videos?',
            'How long is my longest video?',
          ]

          for (const query of queries) {
            const result = await classifyIntent(query)
            expect(result.data.type).toBe('analytics')
          }
        },
        TEST_TIMEOUT
      )

      it(
        'classifies help requests',
        async () => {
          const queries = ['What can you do?', 'How do I use this?', 'Help me understand']

          for (const query of queries) {
            const result = await classifyIntent(query)
            expect(result.data.type).toBe('general')
          }
        },
        TEST_TIMEOUT
      )
    })

    describe('Analytics Response', () => {
      it(
        'generates analytics responses',
        async () => {
          const analytics = {
            totalDuration: 9000,
            totalDurationFormatted: '2 hours 30 minutes',
            uniqueVideos: 50,
            totalScenes: 300,
            dateRange: {
              oldest: new Date('2025-01-01'),
              newest: new Date('2025-11-01'),
            },
            emotionCounts: {
              happy: 120,
              sad: 50,
              surprised: 30,
              angry: 20,
            },
            faceOccurrences: {
              John: 80,
              Alice: 60,
              Bob: 40,
            },
            averageSceneDuration: 2,
            sceneIds: Array.from({ length: 300 }, (_, i) => `scene-${i + 1}`),
          }

          const response = await generateAnalyticsResponse('Tell me about my videos', analytics)

          expect(typeof response.data).toBe('string')
          expect(response.data).toContain('50')
          expect(response.data).toMatch(/2 hours(?: and)? 30 minutes/)
        },
        TEST_TIMEOUT
      )
      it(
        'handles analytics with no emotions',
        async () => {
          const analytics = {
            totalDuration: 1000,
            totalDurationFormatted: '16 minutes 40 seconds',
            uniqueVideos: 10,
            totalScenes: 50,
            emotionCounts: {},
            faceOccurrences: {},
          }

          const response = await generateAnalyticsResponse('What emotions do I have?', analytics)

          expect(typeof response.data).toBe('string')
          expect(response.data.toLowerCase()).toMatch(/no (specific )?emotions?.*detected|none|not detected/)
        },
        TEST_TIMEOUT
      )

      it(
        'handles analytics with no people',
        async () => {
          const analytics = {
            totalDuration: 1000,
            totalDurationFormatted: '16 minutes 40 seconds',
            uniqueVideos: 10,
            totalScenes: 50,
            emotionCounts: { happy: 20 },
            faceOccurrences: {},
          }

          const response = await generateAnalyticsResponse('Who is in my videos?', analytics)

          expect(typeof response.data).toBe('string')
          expect(response.data.toLowerCase()).toMatch(/no people|no one|not detected|no faces/)
        },
        TEST_TIMEOUT
      )

      it(
        'emphasizes dominant emotion',
        async () => {
          const analytics = {
            totalDuration: 1000,
            totalDurationFormatted: '16 minutes 40 seconds',
            uniqueVideos: 10,
            totalScenes: 50,
            emotionCounts: {
              happy: 100,
              sad: 5,
              angry: 2,
            },
            faceOccurrences: {},
          }

          const response = await generateAnalyticsResponse('What emotions dominate?', analytics)

          expect(response.data.toLowerCase()).toMatch(/happy|most|dominant/)
        },
        TEST_TIMEOUT
      )
    })
  })
})
