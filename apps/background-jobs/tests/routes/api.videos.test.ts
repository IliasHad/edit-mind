import request from 'supertest'
import express, { Express } from 'express'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import crypto from 'crypto'
import { clearAllMockModels, mockDatabase } from '../setup'

const RAW_TOKEN = 'test-access-token-videos'
const TOKEN_HASH = crypto.createHash('sha256').update(RAW_TOKEN).digest('hex')

vi.mock('@db/models/AccessToken', () => ({
  AccessTokenModel: mockDatabase.AccessToken,
}))

vi.mock('@db/models/Video', () => ({
  VideoModel: {
    findMany: vi.fn(),
    findById: vi.fn(),
    count: vi.fn(),
  },
}))

vi.mock('@vector/services/db', () => ({
  getByVideoSource: vi.fn(),
}))

vi.mock('@background-jobs/utils/serialize', () => ({
  sanitizeForJson: (data: unknown) => data,
}))

vi.mock('@shared/services/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

import videosRouter from '../../src/routes/api/videos'
import { requireAccessToken } from '../../src/middleware/accessTokenAuth'
import { VideoModel } from '@db/models/Video'
import { getByVideoSource } from '@vector/services/db'

const makeVideo = (userId: string, overrides = {}) => ({
  id: 'vid-1',
  userId,
  source: '/media/videos/test.mp4',
  name: 'Test Video',
  duration: 0,
  importAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  shottedAt: new Date().toISOString(),
  thumbnailUrl: '/media/.thumbnails/test.jpg',
  faces: null,
  emotions: null,
  shotTypes: null,
  objects: null,
  location: null,
  labels: null,
  aspectRatio: '16:9',
  folderId: null,
  ...overrides,
})

describe('API Videos Routes', () => {
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
    app.use('/videos', requireAccessToken, videosRouter)
  })

  afterEach(() => {
    clearAllMockModels()
  })

  describe('GET /videos', () => {
    it('should list videos for the token owner', async () => {
      const videos = [makeVideo(userId)]
      vi.mocked(VideoModel.findMany).mockResolvedValue(videos as never)
      vi.mocked(VideoModel.count).mockResolvedValue(1)

      const res = await request(app).get('/videos').set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(res.status).toBe(200)
      expect(res.body.videos).toHaveLength(1)
      expect(res.body.videos[0].name).toBe('Test Video')
      expect(VideoModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId } })
      )
    })

    it('should return pagination metadata', async () => {
      const videos = [makeVideo(userId, { id: 'v1' }), makeVideo(userId, { id: 'v2' })]
      vi.mocked(VideoModel.findMany).mockResolvedValue(videos as never)
      vi.mocked(VideoModel.count).mockResolvedValue(10)

      const res = await request(app)
        .get('/videos?limit=2&offset=0')
        .set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(res.status).toBe(200)
      expect(res.body.total).toBe(10)
      expect(res.body.limit).toBe(2)
      expect(res.body.offset).toBe(0)
      expect(res.body.hasMore).toBe(true)
      expect(res.body.totalPages).toBe(5)
    })

    it('should report hasMore=false on the last page', async () => {
      const videos = [makeVideo(userId)]
      vi.mocked(VideoModel.findMany).mockResolvedValue(videos as never)
      vi.mocked(VideoModel.count).mockResolvedValue(3)

      const res = await request(app)
        .get('/videos?limit=2&offset=2')
        .set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(res.status).toBe(200)
      expect(res.body.hasMore).toBe(false)
    })

    it('should pass limit and offset to VideoModel', async () => {
      vi.mocked(VideoModel.findMany).mockResolvedValue([])
      vi.mocked(VideoModel.count).mockResolvedValue(0)

      await request(app)
        .get('/videos?limit=10&offset=20')
        .set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(VideoModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 20 })
      )
    })

    it('should return 400 for limit below 1', async () => {
      const res = await request(app)
        .get('/videos?limit=0')
        .set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(res.status).toBe(400)
    })

    it('should return 400 for limit above 100', async () => {
      const res = await request(app)
        .get('/videos?limit=101')
        .set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(res.status).toBe(400)
    })

    it('should return an empty list when no videos exist', async () => {
      vi.mocked(VideoModel.findMany).mockResolvedValue([])
      vi.mocked(VideoModel.count).mockResolvedValue(0)

      const res = await request(app).get('/videos').set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(res.status).toBe(200)
      expect(res.body.videos).toHaveLength(0)
      expect(res.body.total).toBe(0)
      expect(res.body.hasMore).toBe(false)
    })

    it('should return 401 when no token is provided', async () => {
      const res = await request(app).get('/videos')
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('Unauthorized')
    })

    it('should return 401 for an unknown token', async () => {
      const res = await request(app)
        .get('/videos')
        .set('Authorization', 'Bearer unknown-token-xyz')
      expect(res.status).toBe(401)
    })

    it('should return 403 when token lacks videos_read scope', async () => {
      const noScopeToken = 'no-scope-token-videos'
      const noScopeHash = crypto.createHash('sha256').update(noScopeToken).digest('hex')
      await mockDatabase.AccessToken.create({
        userId,
        tokenHash: noScopeHash,
        scopes: [],
        allowedIps: ['*'],
      })

      const res = await request(app)
        .get('/videos')
        .set('Authorization', `Bearer ${noScopeToken}`)

      expect(res.status).toBe(403)
      expect(res.body.error).toBe('Forbidden')
    })

    it('should return 401 for an expired token', async () => {
      const expiredToken = 'expired-access-token-videos'
      const expiredHash = crypto.createHash('sha256').update(expiredToken).digest('hex')
      await mockDatabase.AccessToken.create({
        userId,
        tokenHash: expiredHash,
        scopes: ['videos_read'],
        allowedIps: ['*'],
        expiresAt: new Date('2000-01-01'),
      })

      const res = await request(app)
        .get('/videos')
        .set('Authorization', `Bearer ${expiredToken}`)

      expect(res.status).toBe(401)
      expect(res.body.message).toBe('Token expired')
    })

    it('should return 500 when VideoModel throws', async () => {
      vi.mocked(VideoModel.findMany).mockRejectedValue(new Error('DB error'))
      vi.mocked(VideoModel.count).mockResolvedValue(0)

      const res = await request(app).get('/videos').set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(res.status).toBe(500)
      expect(res.body.error).toBe('Failed to list videos')
    })
  })

  describe('GET /videos/:id', () => {
    it('should return video details and scenes', async () => {
      const video = makeVideo(userId)
      vi.mocked(VideoModel.findById).mockResolvedValue(video as never)
      vi.mocked(getByVideoSource).mockResolvedValue({
        id: video.id,
        source: video.source,
        name: video.name,
        scenes: [{ id: 'scene-1' } as never],
      } as never)

      const res = await request(app)
        .get(`/videos/${video.id}`)
        .set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(res.status).toBe(200)
      expect(res.body.video.id).toBe(video.id)
      expect(res.body.scenes).toHaveLength(1)
    })

    it('should return 404 for a video that does not exist', async () => {
      vi.mocked(VideoModel.findById).mockResolvedValue(null)

      const res = await request(app)
        .get('/videos/non-existent-id')
        .set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(res.status).toBe(404)
    })

    it('should return 404 if video belongs to another user', async () => {
      const video = makeVideo('other-user-id')
      vi.mocked(VideoModel.findById).mockResolvedValue(video as never)

      const res = await request(app)
        .get(`/videos/${video.id}`)
        .set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(res.status).toBe(404)
    })

    it('should return empty scenes when vector DB has no data', async () => {
      const video = makeVideo(userId)
      vi.mocked(VideoModel.findById).mockResolvedValue(video as never)
      vi.mocked(getByVideoSource).mockResolvedValue(null)

      const res = await request(app)
        .get(`/videos/${video.id}`)
        .set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(res.status).toBe(200)
      expect(res.body.scenes).toEqual([])
    })
  })
})
