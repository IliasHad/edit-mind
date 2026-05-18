import request from 'supertest'
import express, { Express } from 'express'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import crypto from 'crypto'
import { clearAllMockModels, mockDatabase } from '../setup'

const RAW_TOKEN = 'test-access-token-search'
const TOKEN_HASH = crypto.createHash('sha256').update(RAW_TOKEN).digest('hex')

vi.mock('@db/models/AccessToken', () => ({
  AccessTokenModel: mockDatabase.AccessToken,
}))

vi.mock('@search/services', () => ({
  searchScenes: vi.fn(),
}))

vi.mock('@background-jobs/utils/serialize', () => ({
  sanitizeForJson: (data: unknown) => data,
}))

vi.mock('@shared/services/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

import searchRouter from '../../src/routes/api/search'
import { requireAccessToken } from '../../src/middleware/accessTokenAuth'
import { searchScenes } from '@search/services'

const makeScene = (overrides = {}) => ({
  id: 'scene-1',
  source: '/media/videos/test.mp4',
  startTime: 0,
  endTime: 5,
  description: 'A test scene',
  matched: true,
  ...overrides,
})

const makeVideo = (overrides = {}) => ({
  id: 'vid-1',
  source: '/media/videos/test.mp4',
  name: 'Test Video',
  duration: 30,
  importAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  thumbnailUrl: '',
  aspectRatio: '16:9',
  location: null,
  scenes: [makeScene()],
  sceneCount: 1,
  ...overrides,
})

describe('API Search Routes', () => {
  let app: Express
  let userId: string

  beforeEach(async () => {
    clearAllMockModels()
    vi.clearAllMocks()

    const user = await mockDatabase.User.create({ email: 'test@example.com' })
    userId = user.id
    await mockDatabase.AccessToken.create({
      userId,
      tokenHash: TOKEN_HASH,
      scopes: ['videos_read'],
      allowedIps: ['*'],
    })

    app = express()
    app.use(express.json())
    app.use('/search', requireAccessToken, searchRouter)
  })

  afterEach(() => {
    clearAllMockModels()
  })

  describe('POST /search', () => {
    it('should return videos with scenes', async () => {
      const videos = [makeVideo({ id: 'v1', name: 'Alpha' }), makeVideo({ id: 'v2', name: 'Beta' })]
      vi.mocked(searchScenes).mockResolvedValue(videos as never)

      const res = await request(app)
        .post('/search')
        .set('Authorization', `Bearer ${RAW_TOKEN}`)
        .send({ query: 'sunset' })

      expect(res.status).toBe(200)
      expect(res.body.videos).toHaveLength(2)
      expect(res.body.videos[0].scenes).toBeDefined()
      expect(res.body.limit).toBe(30)
      expect(res.body.offset).toBe(0)
    })

    it('should pass query as semanticQuery to searchScenes', async () => {
      vi.mocked(searchScenes).mockResolvedValue([makeVideo()] as never)

      await request(app)
        .post('/search')
        .set('Authorization', `Bearer ${RAW_TOKEN}`)
        .send({ query: 'sunset beach' })

      expect(searchScenes).toHaveBeenCalledWith(
        expect.objectContaining({ semanticQuery: 'sunset beach' }),
        expect.any(Number),
        true,
      )
    })

    it('should use semanticQuery directly when provided without query', async () => {
      vi.mocked(searchScenes).mockResolvedValue([makeVideo()] as never)

      await request(app)
        .post('/search')
        .set('Authorization', `Bearer ${RAW_TOKEN}`)
        .send({ semanticQuery: 'golden hour' })

      expect(searchScenes).toHaveBeenCalledWith(
        expect.objectContaining({ semanticQuery: 'golden hour' }),
        expect.any(Number),
        true,
      )
    })

    it('should pass locations filter to searchScenes', async () => {
      vi.mocked(searchScenes).mockResolvedValue([makeVideo()] as never)

      await request(app)
        .post('/search')
        .set('Authorization', `Bearer ${RAW_TOKEN}`)
        .send({ locations: ['Paris'] })

      expect(searchScenes).toHaveBeenCalledWith(
        expect.objectContaining({ locations: ['Paris'] }),
        expect.any(Number),
        true,
      )
    })

    it('should pass aspectRatio filter to searchScenes', async () => {
      vi.mocked(searchScenes).mockResolvedValue([makeVideo({ aspectRatio: '16:9' })] as never)

      await request(app)
        .post('/search')
        .set('Authorization', `Bearer ${RAW_TOKEN}`)
        .send({ aspectRatio: '16:9' })

      expect(searchScenes).toHaveBeenCalledWith(
        expect.objectContaining({ aspectRatio: '16:9' }),
        expect.any(Number),
        true,
      )
    })

    it('should paginate results using offset and limit', async () => {
      const videos = Array.from({ length: 50 }, (_, i) => makeVideo({ id: `v${i}` }))
      vi.mocked(searchScenes).mockResolvedValue(videos as never)

      const res = await request(app)
        .post('/search')
        .set('Authorization', `Bearer ${RAW_TOKEN}`)
        .send({ query: 'test', limit: 2, offset: 0 })

      expect(res.status).toBe(200)
      expect(res.body.total).toBe(50)
      expect(res.body.videos).toHaveLength(2)
      expect(res.body.hasMore).toBe(true)
      expect(res.body.totalPages).toBe(25)
    })

    it('should report hasMore=false on the last page', async () => {
      const videos = Array.from({ length: 3 }, (_, i) => makeVideo({ id: `v${i}` }))
      vi.mocked(searchScenes).mockResolvedValue(videos as never)

      const res = await request(app)
        .post('/search')
        .set('Authorization', `Bearer ${RAW_TOKEN}`)
        .send({ query: 'test', limit: 2, offset: 2 })

      expect(res.status).toBe(200)
      expect(res.body.hasMore).toBe(false)
    })

    it('should return empty results when searchScenes returns nothing', async () => {
      vi.mocked(searchScenes).mockResolvedValue([])

      const res = await request(app)
        .post('/search')
        .set('Authorization', `Bearer ${RAW_TOKEN}`)
        .send({})

      expect(res.status).toBe(200)
      expect(res.body.videos).toHaveLength(0)
      expect(res.body.total).toBe(0)
      expect(res.body.hasMore).toBe(false)
    })

    it('should return 400 for invalid request body', async () => {
      const res = await request(app)
        .post('/search')
        .set('Authorization', `Bearer ${RAW_TOKEN}`)
        .send({ limit: -1 })

      expect(res.status).toBe(400)
    })

    it('should return 401 with no auth token', async () => {
      const res = await request(app).post('/search').send({})
      expect(res.status).toBe(401)
    })

    it('should return 403 when token lacks videos_read scope', async () => {
      const noScopeToken = 'no-scope-search'
      const noScopeHash = crypto.createHash('sha256').update(noScopeToken).digest('hex')
      await mockDatabase.AccessToken.create({
        userId,
        tokenHash: noScopeHash,
        scopes: [],
        allowedIps: ['*'],
      })

      const res = await request(app)
        .post('/search')
        .set('Authorization', `Bearer ${noScopeToken}`)
        .send({})

      expect(res.status).toBe(403)
    })

    it('should return 500 when searchScenes throws', async () => {
      vi.mocked(searchScenes).mockRejectedValue(new Error('ChromaDB unavailable'))

      const res = await request(app)
        .post('/search')
        .set('Authorization', `Bearer ${RAW_TOKEN}`)
        .send({ query: 'test' })

      expect(res.status).toBe(500)
      expect(res.body.error).toBe('Failed to search videos')
    })
  })
})
