import request from 'supertest'
import express, { Express } from 'express'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import crypto from 'crypto'
import { clearAllMockModels, mockDatabase } from '../setup'

const RAW_TOKEN = 'test-access-token-collections'
const TOKEN_HASH = crypto.createHash('sha256').update(RAW_TOKEN).digest('hex')

vi.mock('@db/models/AccessToken', () => ({
  AccessTokenModel: mockDatabase.AccessToken,
}))

vi.mock('@db/models/Collection', () => ({
  CollectionModel: {
    findMany: vi.fn(),
    findById: vi.fn(),
    count: vi.fn(),
  },
}))

vi.mock('@db/models/CollectionItem', () => ({
  CollectionItemModel: {
    findManyAndVideos: vi.fn(),
  },
}))

vi.mock('@background-jobs/utils/serialize', () => ({
  sanitizeForJson: (data: unknown) => data,
}))

vi.mock('@shared/services/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

import collectionsRouter from '../../src/routes/api/collections'
import { requireAccessToken } from '../../src/middleware/accessTokenAuth'
import { CollectionModel } from '@db/models/Collection'
import { CollectionItemModel } from '@db/models/CollectionItem'

const makeCollection = (userId: string, type = 'custom') => ({
  id: 'col-1',
  userId,
  name: 'Test Collection',
  description: null,
  type,
  isAutoPopulated: true,
  autoUpdateEnabled: true,
  status: 'active',
  itemCount: 0,
  totalDuration: 0,
  lastUpdated: new Date().toISOString(),
  thumbnailUrl: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

describe('API Collections Routes', () => {
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
      scopes: ['collections_read'],
      allowedIps: ['*'],
    })

    app = express()
    app.use(express.json())
    app.use('/collections', requireAccessToken, collectionsRouter)
  })

  afterEach(() => {
    clearAllMockModels()
  })

  describe('GET /collections', () => {
    it('should return all collections for the user', async () => {
      const collections = [makeCollection(userId)]
      vi.mocked(CollectionModel.findMany).mockResolvedValue(collections as never)
      vi.mocked(CollectionModel.count).mockResolvedValue(1)

      const res = await request(app)
        .get('/collections')
        .set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(res.status).toBe(200)
      expect(res.body.collections).toHaveLength(1)
      expect(CollectionModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId } })
      )
    })

    it('should return pagination metadata', async () => {
      const collections = [makeCollection(userId, 'custom'), makeCollection(userId, 'b_roll')]
      vi.mocked(CollectionModel.findMany).mockResolvedValue(collections as never)
      vi.mocked(CollectionModel.count).mockResolvedValue(8)

      const res = await request(app)
        .get('/collections?limit=2&offset=0')
        .set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(res.status).toBe(200)
      expect(res.body.total).toBe(8)
      expect(res.body.limit).toBe(2)
      expect(res.body.offset).toBe(0)
      expect(res.body.hasMore).toBe(true)
      expect(res.body.totalPages).toBe(4)
    })

    it('should report hasMore=false on the last page', async () => {
      vi.mocked(CollectionModel.findMany).mockResolvedValue([makeCollection(userId)] as never)
      vi.mocked(CollectionModel.count).mockResolvedValue(3)

      const res = await request(app)
        .get('/collections?limit=2&offset=2')
        .set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(res.status).toBe(200)
      expect(res.body.hasMore).toBe(false)
    })

    it('should filter by collection type', async () => {
      const collections = [makeCollection(userId, 'people')]
      vi.mocked(CollectionModel.findMany).mockResolvedValue(collections as never)
      vi.mocked(CollectionModel.count).mockResolvedValue(1)

      const res = await request(app)
        .get('/collections?type=people')
        .set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(res.status).toBe(200)
      expect(CollectionModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId, type: 'people' } })
      )
    })

    it('should return all collections when type=all', async () => {
      vi.mocked(CollectionModel.findMany).mockResolvedValue([])
      vi.mocked(CollectionModel.count).mockResolvedValue(0)

      const res = await request(app)
        .get('/collections?type=all')
        .set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(res.status).toBe(200)
      expect(CollectionModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId } })
      )
    })

    it('should return 400 for an invalid collection type', async () => {
      const res = await request(app)
        .get('/collections?type=invalid_type')
        .set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Invalid query parameters')
    })

    it('should return 400 for invalid pagination parameters', async () => {
      const res = await request(app)
        .get('/collections?limit=0')
        .set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(res.status).toBe(400)
    })

    it('should return 401 with no auth token', async () => {
      const res = await request(app).get('/collections')
      expect(res.status).toBe(401)
    })

    it('should return 403 when token lacks collections_read scope', async () => {
      const noScopeToken = 'no-scope-collections'
      const noScopeHash = crypto.createHash('sha256').update(noScopeToken).digest('hex')
      await mockDatabase.AccessToken.create({
        userId,
        tokenHash: noScopeHash,
        scopes: [],
        allowedIps: ['*'],
      })

      const res = await request(app)
        .get('/collections')
        .set('Authorization', `Bearer ${noScopeToken}`)

      expect(res.status).toBe(403)
    })
  })

  describe('GET /collections/:id', () => {
    it('should return collection with items', async () => {
      const collection = makeCollection(userId)
      const items = [
        {
          id: 'item-1',
          collectionId: collection.id,
          videoId: 'vid-1',
          sceneIds: ['s1', 's2'],
          confidence: 0.9,
          matchType: 'embedding',
          viewCount: 0,
          exportCount: 0,
          lastUsed: null,
          isPinned: false,
          userNotes: null,
          addedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          video: { id: 'vid-1', name: 'My Video', userId },
        },
      ]

      vi.mocked(CollectionModel.findById).mockResolvedValue(collection as never)
      vi.mocked(CollectionItemModel.findManyAndVideos).mockResolvedValue(items as never)

      const res = await request(app)
        .get(`/collections/${collection.id}`)
        .set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(res.status).toBe(200)
      expect(res.body.collection.id).toBe(collection.id)
      expect(res.body.items).toHaveLength(1)
      expect(res.body.items[0].sceneIds).toEqual(['s1', 's2'])
      expect(CollectionItemModel.findManyAndVideos).toHaveBeenCalledWith(collection.id)
    })

    it('should return 404 when collection does not exist', async () => {
      vi.mocked(CollectionModel.findById).mockResolvedValue(null)

      const res = await request(app)
        .get('/collections/non-existent')
        .set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(res.status).toBe(404)
    })

    it('should return 404 when collection belongs to another user', async () => {
      const otherCollection = makeCollection('other-user-id')
      vi.mocked(CollectionModel.findById).mockResolvedValue(otherCollection as never)

      const res = await request(app)
        .get(`/collections/${otherCollection.id}`)
        .set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(res.status).toBe(404)
    })

    it('should return 401 with no auth token', async () => {
      const res = await request(app).get('/collections/col-1')
      expect(res.status).toBe(401)
    })
  })
})
