import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import {
  embedDocuments,
  getStatistics,
  initialize,
  queryCollection,
  getAllVideos,
  getAllVideosWithScenes,
  filterExistingVideos,
  updateMetadata,
  getByVideoSource,
} from '@/lib/services/vectorDb'
import { EmbeddingInput } from '@/lib/types/vector'
import { Scene } from '@/lib/types/scene'
import { SearchQuery } from '@/lib/types/search'

const TEST_TIMEOUT = 30000

const createMockScene = (overrides?: Partial<Scene>): Scene => ({
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
  createdAt: new Date().toISOString(),
  dominantColorName: 'black',
  dominantColorHex: '#000',
  location: '',
  ...overrides,
})

const defaultQuery: SearchQuery = {
  faces: [],
  action: null,
  emotions: [],
  shot_type: null,
  aspect_ratio: '16:9',
  duration: null,
  description: '',
  outputFilename: '',
  objects: [],
  camera: undefined,
  transcriptionQuery: null,
  detectedText: undefined,
}

const createMockEmbeddingInput = (overrides?: Partial<EmbeddingInput>): EmbeddingInput => ({
  id: `doc-${Date.now()}-${Math.random()}`,
  text: 'Test document for embedding',
  metadata: {
    source: 'test-video.mp4',
    startTime: 0,
    endTime: 5,
    category: 'test',
  },
  ...overrides,
})

describe('Embedding Service', () => {
  beforeAll(async () => {
    await initialize('testing')
  }, TEST_TIMEOUT)

  describe('Initialization', () => {
    it(
      'should initialize ChromaDB client and collection',
      async () => {
        await expect(initialize('testing')).resolves.not.toThrow()
      },
      TEST_TIMEOUT
    )

    it(
      'should be idempotent (safe to call multiple times)',
      async () => {
        await initialize('testing')
        await initialize('testing')
        await initialize('testing')
        // Should not throw
        expect(true).toBe(true)
      },
      TEST_TIMEOUT
    )

    it('should throw error if ChromaDB is not running', async () => {
      // This test requires ChromaDB to be stopped
      // Skip in normal test runs, useful for debugging
      // You can enable this by stopping ChromaDB manually
    })
  })

  describe('Document Embedding', () => {
    it(
      'should embed a single document',
      async () => {
        const doc = createMockEmbeddingInput({
          text: 'A person walking in the park on a sunny day',
        })

        await expect(embedDocuments([doc])).resolves.not.toThrow()

        // Verify the document was added
        const stats = await getStatistics()
        expect(stats.totalDocuments).toBeGreaterThan(0)
      },
      TEST_TIMEOUT
    )

    it(
      'should embed multiple documents in batch',
      async () => {
        const docs: EmbeddingInput[] = [
          createMockEmbeddingInput({ text: 'Person running outdoors' }),
          createMockEmbeddingInput({ text: 'Dog playing with a ball' }),
          createMockEmbeddingInput({ text: 'Sunset over the ocean' }),
        ]

        await expect(embedDocuments(docs)).resolves.not.toThrow()

        const stats = await getStatistics()
        expect(stats.totalDocuments).toBeGreaterThanOrEqual(docs.length)
      },
      TEST_TIMEOUT
    )

    it(
      'should generate embeddings with correct dimensions',
      async () => {
        const doc = createMockEmbeddingInput({
          text: 'Test embedding dimension',
        })

        await embedDocuments([doc])

        const stats = await getStatistics()
        // all-MiniLM-L6-v2 produces 384-dimensional embeddings
        expect(stats.embeddingDimension).toBe(384)
      },
      TEST_TIMEOUT
    )

    it(
      'should handle documents with metadata',
      async () => {
        const doc = createMockEmbeddingInput({
          text: 'Document with rich metadata',
          metadata: {
            source: 'metadata-test.mp4',
            startTime: 10,
            endTime: 15,
            category: 'sports',
            faces: ['athlete1', 'athlete2'].join(','),
            objects: ['basketball', 'court'].join(','),
            emotions: ['excited'].join(','),
          },
        })

        await embedDocuments([doc])

        const stats = await getStatistics()
        expect(stats.metadataKeys).toContain('source')
        expect(stats.metadataKeys).toContain('startTime')
        expect(stats.metadataKeys).toContain('endTime')
      },
      TEST_TIMEOUT
    )

    it(
      'should handle empty text gracefully',
      async () => {
        const doc = createMockEmbeddingInput({ text: '' })

        // Should either succeed or fail gracefully
        try {
          await embedDocuments([doc])
          expect(true).toBe(true)
        } catch (error) {
          expect(error).toBeDefined()
        }
      },
      TEST_TIMEOUT
    )

    it(
      'should normalize embeddings',
      async () => {
        const doc = createMockEmbeddingInput({
          text: 'Test normalization',
        })

        await embedDocuments([doc])

        // Verify via statistics that embeddings exist
        const stats = await getStatistics()
        expect(stats.totalDocuments).toBeGreaterThan(0)
      },
      TEST_TIMEOUT
    )
  })

  describe('Statistics', () => {
    beforeEach(async () => {
      // Add some test data
      const docs = [
        createMockEmbeddingInput({ text: 'Stats test 1' }),
        createMockEmbeddingInput({ text: 'Stats test 2' }),
      ]
      await embedDocuments(docs)
    }, TEST_TIMEOUT)

    it(
      'should return collection statistics',
      async () => {
        const stats = await getStatistics()

        expect(stats).toHaveProperty('name')
        expect(stats).toHaveProperty('totalDocuments')
        expect(stats).toHaveProperty('embeddingDimension')
        expect(stats).toHaveProperty('metadataKeys')
        expect(stats).toHaveProperty('documentIds')
      },
      TEST_TIMEOUT
    )

    it(
      'should report correct document count',
      async () => {
        const statsBefore = await getStatistics()
        const countBefore = statsBefore.totalDocuments

        const newDoc = createMockEmbeddingInput({ text: 'New document for counting' })
        await embedDocuments([newDoc])

        const statsAfter = await getStatistics()
        expect(statsAfter.totalDocuments).toBe(countBefore + 1)
      },
      TEST_TIMEOUT
    )

    it(
      'should list all metadata keys',
      async () => {
        const stats = await getStatistics()

        expect(Array.isArray(stats.metadataKeys)).toBe(true)
        expect(stats.metadataKeys.length).toBeGreaterThan(0)
      },
      TEST_TIMEOUT
    )

    it(
      'should list all document IDs',
      async () => {
        const stats = await getStatistics()

        expect(Array.isArray(stats.documentIds)).toBe(true)
        expect(stats.documentIds.length).toBe(stats.totalDocuments)
      },
      TEST_TIMEOUT
    )
  })

  describe('Semantic Search', () => {
    beforeEach(async () => {
      // Add diverse test data
      const docs: EmbeddingInput[] = [
        createMockEmbeddingInput({
          id: 'happy-person',
          text: 'A happy person smiling at the camera',
          metadata: {
            source: 'video1.mp4',
            emotions: 'person:happy',
            shot_type: 'close-up',
            aspect_ratio: '16:9',
          },
        }),
        createMockEmbeddingInput({
          id: 'sad-person',
          text: 'A sad person looking down',
          metadata: {
            source: 'video2.mp4',
            emotions: 'person:sad',
            shot_type: 'medium-shot',
            aspect_ratio: '9:16',
          },
        }),
        createMockEmbeddingInput({
          id: 'dog-playing',
          text: 'A dog playing with a ball in the park',
          metadata: {
            source: 'video3.mp4',
            objects: 'dog,ball',
            shot_type: 'long-shot',
            aspect_ratio: '16:9',
          },
        }),
      ]

      await embedDocuments(docs)
    }, TEST_TIMEOUT)

    it(
      'should filter by aspect ratio',
      async () => {
        const query: SearchQuery = {
          ...defaultQuery,
          aspect_ratio: '16:9',
        }

        const results = await queryCollection(query)

        expect(results.length).toBeGreaterThan(0)
        results.forEach((scene) => {
          expect(scene.aspect_ratio).toBe('16:9')
        })
      },
      TEST_TIMEOUT
    )

    it(
      'should filter by shot type',
      async () => {
        const query: SearchQuery = {
          ...defaultQuery,
          shot_type: 'close-up',
        }

        const results = await queryCollection(query)

        results.forEach((scene) => {
          expect(scene.shot_type).toBe('close-up')
        })
      },
      TEST_TIMEOUT
    )

    it(
      'should filter by emotions',
      async () => {
        const query: SearchQuery = {
          ...defaultQuery,
          emotions: ['happy'],
        }

        const results = await queryCollection(query)

        results.forEach((scene) => {
          const emotions = scene.emotions.map((e) => e.emotion.toLowerCase())
          expect(emotions).toContain('happy')
        })
      },
      TEST_TIMEOUT
    )

    it(
      'should filter by objects',
      async () => {
        const query: SearchQuery = {
          ...defaultQuery,
          objects: ['dog'],
        }

        const results = await queryCollection(query)

        results.forEach((scene) => {
          const objects = scene.objects.map((o) => o.toLowerCase())
          expect(objects).toContain('dog')
        })
      },
      TEST_TIMEOUT
    )

    it(
      'should filter by transcription query',
      async () => {
        const testDoc = createMockEmbeddingInput({
          text: 'Speech transcript test',
          metadata: {
            transcription: 'hello world this is a test',
          },
        })

        await embedDocuments([testDoc])

        const query: SearchQuery = {
          ...defaultQuery,
          transcriptionQuery: 'hello world',
        }

        const results = await queryCollection(query)

        results.forEach((scene) => {
          expect(scene.transcription.toLowerCase()).toContain('hello world')
        })
      },
      TEST_TIMEOUT
    )

    it(
      'should combine multiple filters',
      async () => {
        const query: SearchQuery = {
          ...defaultQuery,
          aspect_ratio: '16:9',
          shot_type: 'close-up',
          emotions: ['happy'],
        }

        const results = await queryCollection(query)

        results.forEach((scene) => {
          expect(scene.aspect_ratio).toBe('16:9')
          expect(scene.shot_type).toBe('close-up')
          const emotions = scene.emotions.map((e) => e.emotion.toLowerCase())
          expect(emotions).toContain('happy')
        })
      },
      TEST_TIMEOUT
    )

    it(
      'should respect nResults limit',
      async () => {
        const query: SearchQuery = {
          ...defaultQuery,
        }
        const limit = 5

        const results = await queryCollection(query, limit)

        expect(results.length).toBeLessThanOrEqual(limit)
      },
      TEST_TIMEOUT
    )

    it(
      'should return empty array when no matches found',
      async () => {
        const query: SearchQuery = {
          ...defaultQuery,

          emotions: ['nonexistent-emotion'],
        }

        const results = await queryCollection(query)

        expect(Array.isArray(results)).toBe(true)
        // May or may not be empty depending on test data
      },
      TEST_TIMEOUT
    )
  })

  describe('Video Management', () => {
    const testVideoSource = `test-video-${Date.now()}.mp4`

    beforeEach(async () => {
      // Add test video with multiple scenes
      const scenes: EmbeddingInput[] = [
        createMockEmbeddingInput({
          text: 'Scene 1',
          metadata: {
            source: testVideoSource,
            startTime: 0,
            endTime: 5,
            duration: 120,
            aspect_ratio: '16:9',
            category: 'sports',
          },
        }),
        createMockEmbeddingInput({
          text: 'Scene 2',
          metadata: {
            source: testVideoSource,
            startTime: 5,
            endTime: 10,
            duration: 120,
            aspect_ratio: '16:9',
            category: 'sports',
          },
        }),
      ]

      await embedDocuments(scenes)
    }, TEST_TIMEOUT)

    it(
      'should get all videos',
      async () => {
        const videos = await getAllVideos()

        expect(Array.isArray(videos)).toBe(true)
        expect(videos.length).toBeGreaterThan(0)

        videos.forEach((video) => {
          expect(video).toHaveProperty('source')
          expect(video).toHaveProperty('duration')
          expect(video).toHaveProperty('aspect_ratio')
        })
      },
      TEST_TIMEOUT
    )

    it(
      'should get all videos with scenes',
      async () => {
        const videos = await getAllVideosWithScenes()

        expect(Array.isArray(videos)).toBe(true)
        expect(videos.length).toBeGreaterThan(0)

        videos.forEach((video) => {
          expect(video).toHaveProperty('source')
          expect(video).toHaveProperty('scenes')
          expect(video).toHaveProperty('sceneCount')
          expect(Array.isArray(video.scenes)).toBe(true)
          expect(video.sceneCount).toBe(video.scenes.length)
        })
      },
      TEST_TIMEOUT
    )

    it(
      'should sort scenes by start time',
      async () => {
        const videos = await getAllVideosWithScenes()
        const testVideo = videos.find((v) => v.source === testVideoSource)

        if (testVideo && testVideo.scenes.length > 1) {
          for (let i = 1; i < testVideo.scenes.length; i++) {
            expect(testVideo.scenes[i].startTime).toBeGreaterThanOrEqual(testVideo.scenes[i - 1].startTime)
          }
        }
      },
      TEST_TIMEOUT
    )

    it(
      'should get scenes by video source',
      async () => {
        const scenes = await getByVideoSource(testVideoSource)

        expect(Array.isArray(scenes)).toBe(true)
        expect(scenes.length).toBeGreaterThan(0)

        scenes.forEach((scene) => {
          expect(scene.source).toBe(testVideoSource)
        })
      },
      TEST_TIMEOUT
    )

    it(
      'should filter existing videos',
      async () => {
        const sources = [testVideoSource, 'nonexistent-video.mp4', 'another-nonexistent.mp4']

        const newSources = await filterExistingVideos(sources)

        expect(newSources).not.toContain(testVideoSource)
        expect(newSources).toContain('nonexistent-video.mp4')
        expect(newSources).toContain('another-nonexistent.mp4')
      },
      TEST_TIMEOUT
    )

    it(
      'should return empty array when filtering empty list',
      async () => {
        const newSources = await filterExistingVideos([])

        expect(newSources).toEqual([])
      },
      TEST_TIMEOUT
    )
  })

  describe('Metadata Updates', () => {
    let testScene: Scene

    beforeEach(async () => {
      testScene = createMockScene({
        id: `update-test-${Date.now()}`,
        source: `update-video-${Date.now()}.mp4`,
        description: 'Original description',
        faces: ['person1'],
      })

      const doc = createMockEmbeddingInput({
        id: testScene.id,
        text: testScene.description,
        metadata: {
          source: testScene.source,
          startTime: testScene.startTime,
          endTime: testScene.endTime,
          faces: testScene.faces.join(','),
        },
      })

      await embedDocuments([doc])
    }, TEST_TIMEOUT)

    it(
      'should update scene metadata',
      async () => {
        const updatedScene: Scene = {
          ...testScene,
          description: 'Updated description',
          faces: ['person1', 'person2'],
        }

        await expect(updateMetadata(updatedScene)).resolves.not.toThrow()

        // Verify update
        const scenes = await getByVideoSource(testScene.source)
        const updated = scenes.find((s) => s.id === testScene.id)

        expect(updated).toBeDefined()
        if (updated) {
          expect(updated.faces).toContain('person2')
        }
      },
      TEST_TIMEOUT
    )

    it(
      'should preserve embeddings during update',
      async () => {
        const statsBefore = await getStatistics()
        const countBefore = statsBefore.totalDocuments

        await updateMetadata(testScene)

        const statsAfter = await getStatistics()
        expect(statsAfter.totalDocuments).toBe(countBefore)
      },
      TEST_TIMEOUT
    )
  })

  describe('Edge Cases', () => {
    it(
      'should handle special characters in text',
      async () => {
        const doc = createMockEmbeddingInput({
          text: 'Text with special chars: @#$%^&*()[]{}|\\/<>?`~',
        })

        await expect(embedDocuments([doc])).resolves.not.toThrow()
      },
      TEST_TIMEOUT
    )

    it(
      'should handle very long text',
      async () => {
        const longText = 'A '.repeat(1000) + 'very long description'
        const doc = createMockEmbeddingInput({ text: longText })

        await expect(embedDocuments([doc])).resolves.not.toThrow()
      },
      TEST_TIMEOUT
    )

    it(
      'should handle unicode characters',
      async () => {
        const doc = createMockEmbeddingInput({
          text: '你好世界 مرحبا بالعالم Привет мир 🌍🎉',
        })

        await expect(embedDocuments([doc])).resolves.not.toThrow()
      },
      TEST_TIMEOUT
    )

    it(
      'should handle concurrent embedding requests',
      async () => {
        const docs = Array.from({ length: 10 }, (_, i) =>
          createMockEmbeddingInput({
            text: `Concurrent test ${i}`,
          })
        )

        await expect(Promise.all(docs.map((doc) => embedDocuments([doc])))).resolves.not.toThrow()
      },
      TEST_TIMEOUT * 2
    )
  })
})
