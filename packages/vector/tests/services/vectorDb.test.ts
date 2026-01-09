import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest'
import {
  embedDocuments,
  getStatistics,
  createVectorDbClient,
  queryCollection,
  getAllVideos,
  getAllVideosWithScenes,
  filterExistingVideos,
  updateMetadata,
  getByVideoSource,
  getVideosMetadataSummary,
  getVideoWithScenesBySceneIds,
  getCollectionCount,
  getUniqueVideoSources,
  updateScenesSource,
  hybridSearch,
  getAllDocs,
  getVideosNotEmbedded,
  getScenesByYear,
} from '@shared/services/vectorDb'
import { EmbeddingInput } from '@shared/types/vector'
import { Scene } from '@shared/types/scene'
import { VideoSearchParams } from '@shared/types/search'
import { VideoSearchParamsSchema } from '@shared/schemas/search'

const mockConstants: Record<string, string | null | boolean> = {
  COLLECTION_NAME: 'testing',
}

vi.mock('@vector/constants', () => mockConstants)

const TEST_TIMEOUT = 40000 * 2

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
  shotType: 'medium-shot',
  aspectRatio: '16:9',
  camera: 'static',
  category: 'test',
  createdAt: new Date().getTime(),
  dominantColorName: 'black',
  dominantColorHex: '#000',
  location: '',
  ...overrides,
})

const baseQuery = VideoSearchParamsSchema.parse({})

const mockEmbedding = (overrides?: Partial<EmbeddingInput>): EmbeddingInput => ({
  id: `doc-${Date.now()}-${Math.random().toString(36).substring(7)}`,
  text: 'Test document for embedding',
  metadata: {
    source: 'test-video.mp4',
    startTime: 0,
    endTime: 5,
    category: 'test',
  },
  ...overrides,
})

describe('VectorDB Service', () => {
  const testCollectionName = `testing-${Date.now()}`

  beforeAll(async () => {
    await createVectorDbClient(testCollectionName)
  }, TEST_TIMEOUT)

  afterAll(async () => {
    // Clean up entire test collection
    const { client } = await createVectorDbClient(testCollectionName)
    try {
      await client?.deleteCollection({ name: testCollectionName })
    } catch (error) {
      console.error('Collection cleanup error:', error)
    }
  }, TEST_TIMEOUT)

  afterEach(async () => {
    const { collection } = await createVectorDbClient('testing')
    if (collection) {
      const allDocs = await getAllDocs()
      const testDocs = allDocs.filter(
        (doc) =>
          doc.source.includes('test') ||
          doc.id.includes('test-') ||
          doc.id.includes('scene-') ||
          doc.id.includes('doc-')
      )

      // Delete in smaller batches to avoid issues
      const batchSize = 10
      for (let i = 0; i < testDocs.length; i += batchSize) {
        const batch = testDocs.slice(i, i + batchSize)
        try {
          await collection.delete({ ids: batch.map((doc) => doc.id) })
        } catch (error) {
          console.error('Cleanup error:', error)
        }
      }
    }
  }, TEST_TIMEOUT)

  describe('Client Initialization', () => {
    it(
      'creates ChromaDB client and collection',
      async () => {
        const { client, collection } = await createVectorDbClient('testing')
        expect(client).toBeDefined()
        expect(collection).toBeDefined()
      },
      TEST_TIMEOUT
    )

    it(
      'handles idempotent initialization',
      async () => {
        await Promise.all([
          createVectorDbClient('testing'),
          createVectorDbClient('testing'),
          createVectorDbClient('testing'),
        ])
        const { collection } = await createVectorDbClient('testing')
        expect(collection).toBeDefined()
      },
      TEST_TIMEOUT
    )

    it(
      'creates different collections for different names',
      async () => {
        const testName = `test-${Date.now()}`
        const { collection } = await createVectorDbClient(testName)
        expect(collection).toBeDefined()
      },
      TEST_TIMEOUT
    )
  })

  describe('Document Embedding', () => {
    it(
      'embeds single document successfully',
      async () => {
        const doc = mockEmbedding({ text: 'A person walking in the park on a sunny day' })
        await embedDocuments([doc])

        const stats = await getStatistics()
        expect(stats.totalDocuments).toBeGreaterThan(0)
      },
      TEST_TIMEOUT
    )

    it(
      'embeds batch of documents',
      async () => {
        const docs = Array.from({ length: 5 }, (_, i) =>
          mockEmbedding({
            text: `Test document ${i}`,
            id: `batch-${Date.now()}-${i}`,
          })
        )

        await embedDocuments(docs)
        const stats = await getStatistics()
        expect(stats.totalDocuments).toBeGreaterThanOrEqual(docs.length)
      },
      TEST_TIMEOUT
    )

    it(
      'generates 768-dimensional embeddings',
      async () => {
        const doc = mockEmbedding({ text: 'Test embedding dimension' })
        await embedDocuments([doc])

        const stats = await getStatistics()
        expect(stats.embeddingDimension).toBe(768)
      },
      TEST_TIMEOUT
    )

    it(
      'stores metadata correctly',
      async () => {
        const metadata = {
          source: 'metadata-test.mp4',
          startTime: 10,
          endTime: 15,
          category: 'sports',
          faces: 'athlete1,athlete2',
          objects: 'basketball,court',
          emotions: 'excited',
        }

        const doc = mockEmbedding({
          text: 'Document with rich metadata',
          metadata,
        })

        await embedDocuments([doc])
        const stats = await getStatistics()

        expect(stats.metadataKeys).toContain('source')
        expect(stats.metadataKeys).toContain('startTime')
        expect(stats.metadataKeys).toContain('category')
      },
      TEST_TIMEOUT
    )

    it(
      'handles empty text gracefully',
      async () => {
        const doc = mockEmbedding({ text: '' })
        await expect(embedDocuments([doc])).resolves.not.toThrow()
      },
      TEST_TIMEOUT
    )

    it(
      'validates documents before embedding',
      async () => {
        const invalidDocs = [mockEmbedding({ text: '', id: '' }), mockEmbedding({ text: 'valid' })]

        await embedDocuments(invalidDocs)
        const stats = await getStatistics()
        expect(stats.totalDocuments).toBeGreaterThan(0)
      },
      TEST_TIMEOUT
    )

    it(
      'handles large batch processing',
      async () => {
        const largeBatch = Array.from({ length: 50 }, (_, i) =>
          mockEmbedding({
            text: `Large batch document ${i}`,
            id: `large-${Date.now()}-${i}`,
          })
        )

        await embedDocuments(largeBatch)
        const stats = await getStatistics()
        expect(stats.totalDocuments).toBeGreaterThanOrEqual(largeBatch.length)
      },
      TEST_TIMEOUT * 2
    )
  })

  describe('Statistics & Analytics', () => {
    beforeEach(async () => {
      const docs = [
        mockEmbedding({ text: 'Stats test 1', id: `stat-${Date.now()}-1` }),
        mockEmbedding({ text: 'Stats test 2', id: `stat-${Date.now()}-2` }),
      ]
      await embedDocuments(docs)
    }, TEST_TIMEOUT)

    it(
      'returns complete statistics',
      async () => {
        const stats = await getStatistics()

        expect(stats).toMatchObject({
          name: expect.any(String),
          totalDocuments: expect.any(Number),
          embeddingDimension: expect.any(Number),
          metadataKeys: expect.any(Array),
          documentIds: expect.any(Array),
        })
      },
      TEST_TIMEOUT
    )

    it(
      'tracks document count accurately',
      async () => {
        const before = await getStatistics()
        const countBefore = before.totalDocuments

        const newDoc = mockEmbedding({
          text: 'New document for counting',
          id: `count-${Date.now()}`,
        })
        await embedDocuments([newDoc])
        // Wait for indexing
        await new Promise((resolve) => setTimeout(resolve, 100))

        const after = await getStatistics()
        expect(after.totalDocuments).toBe(countBefore + 1)
      },
      TEST_TIMEOUT
    )

    it(
      'lists all metadata keys',
      async () => {
        const stats = await getStatistics()

        expect(Array.isArray(stats.metadataKeys)).toBe(true)
        expect(stats.metadataKeys.length).toBeGreaterThan(0)
      },
      TEST_TIMEOUT
    )

    it(
      'matches document IDs with count',
      async () => {
        const stats = await getStatistics()
        expect(stats.documentIds.length).toBe(stats.totalDocuments)
      },
      TEST_TIMEOUT
    )

    it(
      'aggregates video metadata summary',
      async () => {
        const summary = await getVideosMetadataSummary()

        expect(summary).toMatchObject({
          topFaces: expect.any(Array),
          topColors: expect.any(Array),
          topEmotions: expect.any(Array),
          shotTypes: expect.any(Array),
          topObjects: expect.any(Array),
          cameras: expect.any(Array),
        })
      },
      TEST_TIMEOUT
    )
  })

  describe('Semantic & Hybrid Search', () => {
    let testDataIds: string[] = []

    beforeEach(async () => {
      const testData: EmbeddingInput[] = [
        mockEmbedding({
          id: `happy-${Date.now()}`,
          text: 'A happy person smiling at the camera',
          metadata: {
            source: 'video1.mp4',
            emotions: 'person:happy',
            shotType: 'close-up',
            aspectRatio: '16:9',
          },
        }),
        mockEmbedding({
          id: `sad-${Date.now()}`,
          text: 'A sad person looking down',
          metadata: {
            source: 'video2.mp4',
            emotions: 'person:sad',
            shotType: 'medium-shot',
            aspectRatio: '9:16',
          },
        }),
        mockEmbedding({
          id: `dog-${Date.now()}`,
          text: 'A dog playing with a ball in the park',
          metadata: {
            source: 'video3.mp4',
            objects: 'dog,ball',
            shotType: 'long-shot',
            aspectRatio: '16:9',
          },
        }),
      ]
      testDataIds = testData.map((d) => d.id)

      await embedDocuments(testData)
      await new Promise((resolve) => setTimeout(resolve, 100))
    }, TEST_TIMEOUT)

    afterEach(async () => {
      const { collection } = await createVectorDbClient('testing')
      if (collection && testDataIds.length > 0) {
        try {
          await collection.delete({ ids: testDataIds })
        } catch (error) {
          console.error('Test cleanup error:', error)
        }
      }
    }, TEST_TIMEOUT)
    it(
      'filters by aspect ratio',
      async () => {
        const query: VideoSearchParams = { ...baseQuery, aspectRatio: '16:9' }
        const results = await queryCollection(query)

        results.forEach((video) => {
          expect(video.aspectRatio).toBe('16:9')
        })
      },
      TEST_TIMEOUT
    )

    it(
      'filters by shot type',
      async () => {
        const query: VideoSearchParams = { ...baseQuery, shotType: 'close-up' }
        const results = await queryCollection(query)

        results.forEach((video) => {
          expect(video.shotTypes).toContain('close-up')
        })
      },
      TEST_TIMEOUT
    )

    it(
      'filters by emotions',
      async () => {
        const query: VideoSearchParams = { ...baseQuery, emotions: ['happy'] }
        const results = await queryCollection(query)

        results.forEach((video) => {
          const hasEmotion = video.emotions.some((e) => e.toLowerCase() === 'happy')
          expect(hasEmotion).toBe(true)
        })
      },
      TEST_TIMEOUT
    )

    it(
      'filters by objects',
      async () => {
        const query: VideoSearchParams = { ...baseQuery, objects: ['dog'] }
        const results = await queryCollection(query)

        results.forEach((video) => {
          const hasObject = video.objects.some((o) => o.toLowerCase() === 'dog')
          expect(hasObject).toBe(true)
        })
      },
      TEST_TIMEOUT
    )

    it(
      'filters by transcription query',
      async () => {
        const doc = mockEmbedding({
          id: `transcript-${Date.now()}`,
          text: 'Speech transcript test',
          metadata: {
            transcription: 'hello world this is a test',
          },
        })

        await embedDocuments([doc])
        const query: VideoSearchParams = { ...baseQuery, transcriptionQuery: 'hello world' }
        const results = await queryCollection(query)

        expect(results.length).toBeGreaterThan(0)
      },
      TEST_TIMEOUT
    )

    it(
      'combines multiple filters',
      async () => {
        const query: VideoSearchParams = {
          ...baseQuery,
          aspectRatio: '16:9',
          emotions: ['happy'],
        }

        const results = await queryCollection(query)
        results.forEach((video) => {
          expect(video.aspectRatio).toBe('16:9')
          const hasEmotion = video.emotions.some((e) => e.toLowerCase() === 'happy')
          expect(hasEmotion).toBe(true)
        })
      },
      TEST_TIMEOUT
    )

    it(
      'respects nResults limit',
      async () => {
        const limit = 2
        const results = await queryCollection(baseQuery, limit)
        expect(results.length).toBeLessThanOrEqual(limit)
      },
      TEST_TIMEOUT
    )

    it(
      'performs hybrid search with semantic query',
      async () => {
        const query: VideoSearchParams = {
          ...baseQuery,
          semanticQuery: 'happy smiling person',
        }

        const results = await hybridSearch(query)
        expect(Array.isArray(results)).toBe(true)
      },
      TEST_TIMEOUT
    )

    it(
      'performs metadata-only search without semantic query',
      async () => {
        const query: VideoSearchParams = {
          ...baseQuery,
          emotions: ['happy'],
        }

        const results = await hybridSearch(query)
        expect(Array.isArray(results)).toBe(true)
      },
      TEST_TIMEOUT
    )

    it(
      'returns empty array for no matches',
      async () => {
        const query: VideoSearchParams = {
          ...baseQuery,
          emotions: ['nonexistent-emotion-xyz'],
        }

        const results = await queryCollection(query)
        expect(Array.isArray(results)).toBe(true)
      },
      TEST_TIMEOUT
    )
  })

  describe('Video Management', () => {
    const testSource = `test-video-${Date.now()}.mp4`

    beforeEach(async () => {
      const scenes: EmbeddingInput[] = [
        mockEmbedding({
          id: `scene-1-${Date.now()}`,
          text: 'Scene 1',
          metadata: {
            source: testSource,
            startTime: 0,
            endTime: 5,
            duration: 120,
            aspectRatio: '16:9',
            category: 'sports',
          },
        }),
        mockEmbedding({
          id: `scene-2-${Date.now()}`,
          text: 'Scene 2',
          metadata: {
            source: testSource,
            startTime: 5,
            endTime: 10,
            duration: 120,
            aspectRatio: '16:9',
            category: 'sports',
          },
        }),
      ]

      await embedDocuments(scenes)
    }, TEST_TIMEOUT)

    it(
      'retrieves all videos',
      async () => {
        const videos = await getAllVideos()

        expect(Array.isArray(videos)).toBe(true)
        expect(videos.length).toBeGreaterThan(0)

        videos.forEach((video) => {
          expect(video).toMatchObject({
            source: expect.any(String),
            duration: expect.any(Number),
            aspectRatio: expect.any(String),
          })
        })
      },
      TEST_TIMEOUT
    )

    it(
      'retrieves videos with scenes',
      async () => {
        const { videos } = await getAllVideosWithScenes()

        expect(Array.isArray(videos)).toBe(true)
        videos.forEach((video) => {
          expect(video).toMatchObject({
            source: expect.any(String),
            scenes: expect.any(Array),
            sceneCount: expect.any(Number),
          })
          expect(video.sceneCount).toBe(video.scenes.length)
        })
      },
      TEST_TIMEOUT
    )

    it(
      'sorts scenes by start time',
      async () => {
        const { videos } = await getAllVideosWithScenes()
        const testVideo = videos.find((v) => v.source === testSource)

        if (testVideo && testVideo.scenes.length > 1) {
          for (let i = 1; i < testVideo.scenes.length; i++) {
            expect(testVideo.scenes[i].startTime).toBeGreaterThanOrEqual(testVideo.scenes[i - 1].startTime)
          }
        }
      },
      TEST_TIMEOUT
    )

    it(
      'retrieves scenes by video source',
      async () => {
        const scenes = await getByVideoSource(testSource)

        expect(Array.isArray(scenes)).toBe(true)
        expect(scenes.length).toBeGreaterThan(0)
        scenes.forEach((scene) => {
          expect(scene.source).toBe(testSource)
        })
      },
      TEST_TIMEOUT
    )

    it(
      'filters existing videos from list',
      async () => {
        const sources = [testSource, 'nonexistent-video.mp4', 'another-nonexistent.mp4']
        const newSources = await filterExistingVideos(sources)

        expect(newSources).not.toContain(testSource)
        expect(newSources).toContain('nonexistent-video.mp4')
        expect(newSources).toContain('another-nonexistent.mp4')
      },
      TEST_TIMEOUT
    )

    it(
      'handles empty source list',
      async () => {
        const newSources = await filterExistingVideos([])
        expect(newSources).toEqual([])
      },
      TEST_TIMEOUT
    )

    it(
      'retrieves videos not yet embedded',
      async () => {
        const sources = [testSource, 'not-embedded-1.mp4', 'not-embedded-2.mp4']
        const notEmbedded = await getVideosNotEmbedded(sources)

        expect(notEmbedded).toContain('not-embedded-1.mp4')
        expect(notEmbedded).toContain('not-embedded-2.mp4')
        expect(notEmbedded).not.toContain(testSource)
      },
      TEST_TIMEOUT
    )

    it(
      'gets unique video sources',
      async () => {
        const sources = await getUniqueVideoSources()

        expect(Array.isArray(sources)).toBe(true)
        const uniqueSources = new Set(sources)
        expect(uniqueSources.size).toBe(sources.length)
      },
      TEST_TIMEOUT
    )

    it(
      'gets collection count',
      async () => {
        const count = await getCollectionCount()
        expect(typeof count).toBe('number')
        expect(count).toBeGreaterThanOrEqual(0)
      },
      TEST_TIMEOUT
    )

    it(
      'retrieves scenes by scene IDs',
      async () => {
        const allDocs = await getAllDocs()
        const sceneIds = allDocs.slice(0, 3).map((doc) => doc.id)

        const scenes = await getVideoWithScenesBySceneIds(sceneIds)
        expect(scenes.length).toBeGreaterThan(0)
        expect(scenes.length).toBeLessThanOrEqual(sceneIds.length)
      },
      TEST_TIMEOUT
    )

    it(
      'handles empty scene IDs array',
      async () => {
        const scenes = await getVideoWithScenesBySceneIds([])
        expect(scenes).toEqual([])
      },
      TEST_TIMEOUT
    )

    it(
      'paginates video results',
      async () => {
        const limit = 5
        const offset = 0
        const { videos } = await getAllVideosWithScenes(limit, offset)

        expect(videos.length).toBeLessThanOrEqual(limit)
      },
      TEST_TIMEOUT
    )
  })

  describe('Metadata Operations', () => {
    let testScene: Scene

    beforeEach(async () => {
      testScene = mockScene({
        id: `scene-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        source: `update-video-${Date.now()}.mp4`,
        description: 'Original description',
        faces: ['person1'],
      })

      const doc = mockEmbedding({
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
      'updates scene metadata',
      async () => {
        const updated: Scene = {
          ...testScene,
          description: 'Updated description',
          faces: ['person1', 'person2'],
        }

        await updateMetadata(updated)
        const scenes = await getByVideoSource(testScene.source)
        const result = scenes.find((s) => s.id === testScene.id)

        expect(result).toBeDefined()
        expect(result?.faces).toContain('person2')
      },
      TEST_TIMEOUT
    )

    it(
      'preserves embeddings during metadata update',
      async () => {
        const before = await getStatistics()
        await updateMetadata(testScene)
        const after = await getStatistics()

        expect(after.totalDocuments).toBe(before.totalDocuments)
      },
      TEST_TIMEOUT
    )

    it(
      'updates video source across all scenes',
      async () => {
        const oldSource = testScene.source
        const newSource = `renamed-${Date.now()}.mp4`

        await updateScenesSource(oldSource, newSource)
        const scenes = await getByVideoSource(newSource)

        expect(scenes.length).toBeGreaterThan(0)
        scenes.forEach((scene) => {
          expect(scene.source).toBe(newSource)
        })
      },
      TEST_TIMEOUT
    )

    it(
      'handles non-existent source during update',
      async () => {
        const oldSource = 'does-not-exist.mp4'
        const newSource = 'new-source.mp4'

        await expect(updateScenesSource(oldSource, newSource)).resolves.not.toThrow()
      },
      TEST_TIMEOUT
    )
  })

  describe('Time-based Queries', () => {
    it(
      'retrieves scenes by year',
      async () => {
        const currentYear = new Date().getFullYear()
        const doc = mockEmbedding({
          id: `year-test-${Date.now()}`,
          text: 'Year test scene',
          metadata: {
            createdAt: new Date(`${currentYear}-01-15`).getTime(),
          },
        })

        await embedDocuments([doc])
        const { videos } = await getScenesByYear(currentYear)

        expect(Array.isArray(videos)).toBe(true)
      },
      TEST_TIMEOUT
    )

    it(
      'returns empty for year with no data',
      async () => {
        const futureYear = new Date().getFullYear() + 10
        const { videos } = await getScenesByYear(futureYear)

        expect(videos).toEqual([])
      },
      TEST_TIMEOUT
    )
  })
  describe('Aspect Ratio Updates', () => {
    it(
      'updates aspect ratio for all scenes from a video source',
      async () => {
        // Setup: Create test video with multiple scenes
        const videoSource = `test-video-${Date.now()}.mp4`
        const originalRatio = '16:9'
        const newRatio = '9:16'

        // Create multiple test scenes with the same video source
        const testScenes = [
          mockEmbedding({
            id: `scene-${Date.now()}-1`,
            metadata: {
              source: videoSource,
              aspectRatio: originalRatio,
              startTime: 0,
              endTime: 5,
              description: 'First scene',
            },
          }),
          mockEmbedding({
            id: `scene-${Date.now()}-2`,
            metadata: {
              source: videoSource,
              aspectRatio: originalRatio,
              startTime: 5,
              endTime: 10,
              description: 'Second scene',
            },
          }),
          mockEmbedding({
            id: `scene-${Date.now()}-3`,
            metadata: {
              source: videoSource,
              aspectRatio: originalRatio,
              startTime: 10,
              endTime: 15,
              description: 'Third scene',
            },
          }),
        ]

        // Embed the test scenes
        await embedDocuments(testScenes)

        // Execute: Update aspect ratio for all scenes
        const scenes = await getByVideoSource(videoSource)
        expect(scenes.length).toBe(3)

        // Verify original aspect ratio
        scenes.forEach((scene) => {
          expect(scene.aspectRatio).toBe(originalRatio)
        })

        const modifiedScenes = scenes.map((scene) => ({
          ...scene,
          aspectRatio: newRatio,
        }))

        for (const scene of modifiedScenes) {
          await updateMetadata(scene)
        }

        // Verify: Check all scenes have updated aspect ratio
        const updatedScenes = await getByVideoSource(videoSource)
        expect(updatedScenes.length).toBe(3)

        updatedScenes.forEach((scene) => {
          expect(scene.aspectRatio).toBe(newRatio)
          expect(scene.source).toBe(videoSource)
        })
      },
      TEST_TIMEOUT
    )

    it(
      'preserves other metadata when updating aspect ratio',
      async () => {
        const videoSource = `test-video-preserve-${Date.now()}.mp4`
        const originalMetadata = {
          source: videoSource,
          aspectRatio: '16:9',
          startTime: 0,
          endTime: 5,
          description: 'Test scene description',
          shotType: 'close-up',
          faces: 'person1, person2',
          objects: 'laptop, phone',
          emotions: JSON.stringify([{ name: 'person1', emotion: 'happy' }]),
          transcription: 'Hello world',
        }

        const testScene = mockEmbedding({
          id: `scene-preserve-${Date.now()}`,
          metadata: originalMetadata,
        })

        await embedDocuments([testScene])

        // Update aspect ratio
        const scenes = await getByVideoSource(videoSource)
        const modifiedScenes = scenes.map((scene) => ({
          ...scene,
          aspectRatio: '1:1',
        }))

        for (const scene of modifiedScenes) {
          await updateMetadata(scene)
        }

        // Verify all other metadata is preserved
        const updatedScenes = await getByVideoSource(videoSource)
        expect(updatedScenes.length).toBe(1)

        const updatedScene = updatedScenes[0]
        expect(updatedScene.aspectRatio).toBe('1:1')
        expect(updatedScene.shotType).toBe(originalMetadata.shotType)
        expect(updatedScene.faces).toEqual(['person1', 'person2'])
        expect(updatedScene.objects).toEqual(['laptop', 'phone'])
        expect(updatedScene.transcription).toBe(originalMetadata.transcription)
      },
      TEST_TIMEOUT
    )

    it(
      'handles video source with no scenes gracefully',
      async () => {
        const nonExistentSource = `non-existent-${Date.now()}.mp4`

        const scenes = await getByVideoSource(nonExistentSource)
        expect(scenes.length).toBe(0)

        const modifiedScenes = scenes.map((scene) => ({
          ...scene,
          aspectRatio: '9:16',
        }))

        // Should not throw when updating empty array
        for (const scene of modifiedScenes) {
          await updateMetadata(scene)
        }

        // Verify still no scenes
        const updatedScenes = await getByVideoSource(nonExistentSource)
        expect(updatedScenes.length).toBe(0)
      },
      TEST_TIMEOUT
    )

    it(
      'updates to valid aspect ratio enum values',
      async () => {
        const videoSource = `test-video-ratios-${Date.now()}.mp4`
        const validRatios = ['16:9', '9:16', '1:1', '4:3', '8:7']

        const testScene = mockEmbedding({
          id: `scene-ratio-${Date.now()}`,
          metadata: {
            source: videoSource,
            aspectRatio: '16:9',
            startTime: 0,
            endTime: 5,
          },
        })

        await embedDocuments([testScene])

        // Test updating to each valid ratio
        for (const newRatio of validRatios) {
          const scenes = await getByVideoSource(videoSource)
          const modifiedScenes = scenes.map((scene) => ({
            ...scene,
            aspectRatio: newRatio,
          }))

          for (const scene of modifiedScenes) {
            await updateMetadata(scene)
          }

          const updatedScenes = await getByVideoSource(videoSource)
          expect(updatedScenes[0].aspectRatio).toBe(newRatio)
        }
      },
      TEST_TIMEOUT
    )

    it(
      'updates aspect ratio in batch for large video collections',
      async () => {
        const videoSource = `large-video-${Date.now()}.mp4`
        const sceneCount = 50
        const originalRatio = '16:9'
        const newRatio = '9:16'

        // Create many scenes
        const testScenes = Array.from({ length: sceneCount }, (_, i) =>
          mockEmbedding({
            id: `batch-scene-${Date.now()}-${i}`,
            metadata: {
              source: videoSource,
              aspectRatio: originalRatio,
              startTime: i * 5,
              endTime: (i + 1) * 5,
              description: `Scene ${i}`,
            },
          })
        )

        await embedDocuments(testScenes)

        // Update all scenes
        const scenes = await getByVideoSource(videoSource)
        expect(scenes.length).toBe(sceneCount)

        const modifiedScenes = scenes.map((scene) => ({
          ...scene,
          aspectRatio: newRatio,
        }))

        for (const scene of modifiedScenes) {
          await updateMetadata(scene)
        }

        // Verify all updated
        const updatedScenes = await getByVideoSource(videoSource)
        expect(updatedScenes.length).toBe(sceneCount)

        updatedScenes.forEach((scene) => {
          expect(scene.aspectRatio).toBe(newRatio)
          expect(scene.source).toBe(videoSource)
        })
      },
      TEST_TIMEOUT * 3
    )

    it(
      'handles concurrent aspect ratio updates',
      async () => {
        const videoSources = Array.from({ length: 3 }, (_, i) => `concurrent-video-${Date.now()}-${i}.mp4`)
        const newRatio = '1:1'

        // Create scenes for multiple videos
        const allScenes = videoSources.flatMap((source, videoIndex) =>
          Array.from({ length: 3 }, (_, sceneIndex) =>
            mockEmbedding({
              id: `concurrent-scene-${Date.now()}-${videoIndex}-${sceneIndex}`,
              metadata: {
                source,
                aspectRatio: '16:9',
                startTime: sceneIndex * 5,
                endTime: (sceneIndex + 1) * 5,
              },
            })
          )
        )

        await embedDocuments(allScenes)

        // Update all videos concurrently
        await Promise.all(
          videoSources.map(async (source) => {
            const scenes = await getByVideoSource(source)
            const modifiedScenes = scenes.map((scene) => ({
              ...scene,
              aspectRatio: newRatio,
            }))

            for (const scene of modifiedScenes) {
              await updateMetadata(scene)
            }
          })
        )

        // Verify all videos updated correctly
        for (const source of videoSources) {
          const updatedScenes = await getByVideoSource(source)
          expect(updatedScenes.length).toBe(3)
          updatedScenes.forEach((scene) => {
            expect(scene.aspectRatio).toBe(newRatio)
          })
        }
      },
      TEST_TIMEOUT
    )
  })
  describe('Edge Cases & Error Handling', () => {
    it(
      'handles special characters in text',
      async () => {
        const doc = mockEmbedding({
          id: `special-${Date.now()}`,
          text: 'Special chars: @#$%^&*()[]{}|\\/<>?`~',
        })

        await expect(embedDocuments([doc])).resolves.not.toThrow()
      },
      TEST_TIMEOUT
    )

    it(
      'handles very long text',
      async () => {
        const longText = 'A '.repeat(1000) + 'very long description'
        const doc = mockEmbedding({
          id: `long-${Date.now()}`,
          text: longText,
        })

        await expect(embedDocuments([doc])).resolves.not.toThrow()
      },
      TEST_TIMEOUT
    )

    it(
      'handles unicode characters',
      async () => {
        const doc = mockEmbedding({
          id: `unicode-${Date.now()}`,
          text: '你好世界 مرحبا بالعالم Привет мир 🌍🎉',
        })

        await expect(embedDocuments([doc])).resolves.not.toThrow()
      },
      TEST_TIMEOUT
    )

    it(
      'handles concurrent embedding requests',
      async () => {
        const docs = Array.from({ length: 10 }, (_, i) =>
          mockEmbedding({
            id: `concurrent-${Date.now()}-${i}`,
            text: `Concurrent test ${i}`,
          })
        )

        await expect(Promise.all(docs.map((doc) => embedDocuments([doc])))).resolves.not.toThrow()
      },
      TEST_TIMEOUT * 2
    )

    it(
      'handles malformed metadata gracefully',
      async () => {
        const doc = mockEmbedding({
          id: `malformed-${Date.now()}`,
          metadata: {
            source: null as any,
            startTime: 'invalid' as any,
          },
        })

        await expect(embedDocuments([doc])).resolves.not.toThrow()
      },
      TEST_TIMEOUT
    )

    it(
      'handles null or undefined values in search',
      async () => {
        const query: VideoSearchParams = {
          ...baseQuery,
          emotions: null as any,
          objects: undefined as any,
        }

        await expect(queryCollection(query)).resolves.not.toThrow()
      },
      TEST_TIMEOUT
    )

    it(
      'retrieves all documents',
      async () => {
        const docs = await getAllDocs()
        expect(Array.isArray(docs)).toBe(true)
      },
      TEST_TIMEOUT
    )
  })
})
