import request from 'supertest'
import express, { Express } from 'express'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import crypto from 'crypto'
import { clearAllMockModels, mockDatabase } from '../setup'

const RAW_TOKEN = 'test-access-token-suggestions'
const TOKEN_HASH = crypto.createHash('sha256').update(RAW_TOKEN).digest('hex')

vi.mock('@db/models/AccessToken', () => ({
  AccessTokenModel: mockDatabase.AccessToken,
}))

vi.mock('@search/services/suggestion', () => ({
  getGroupedSearchSuggestions: vi.fn(),
  getPopularSuggestions: vi.fn(),
}))

vi.mock('@background-jobs/utils/serialize', () => ({
  sanitizeForJson: (data: unknown) => data,
}))

vi.mock('@shared/services/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

import suggestionsRouter from '../../src/routes/api/suggestions'
import { requireAccessToken } from '../../src/middleware/accessTokenAuth'
import { getGroupedSearchSuggestions, getPopularSuggestions } from '@search/services/suggestion'

const mockSuggestion = { text: 'person', type: 'face', count: 10, sceneCount: 5 }

describe('API Suggestions Routes', () => {
  let app: Express

  beforeEach(async () => {
    clearAllMockModels()
    vi.clearAllMocks()

    const user = await mockDatabase.User.create({ email: 'test@example.com' })
    await mockDatabase.AccessToken.create({
      userId: user.id,
      tokenHash: TOKEN_HASH,
      scopes: ['videos_read'],
      allowedIps: ['*'],
    })

    app = express()
    app.use(express.json())
    app.use('/suggestions', requireAccessToken, suggestionsRouter)
  })

  afterEach(() => {
    clearAllMockModels()
  })

  describe('GET /suggestions', () => {
    it('should return popular suggestions when no query is provided', async () => {
      vi.mocked(getPopularSuggestions).mockResolvedValue([mockSuggestion])

      const res = await request(app)
        .get('/suggestions')
        .set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(res.status).toBe(200)
      expect(res.body.suggestions).toHaveLength(1)
      expect(res.body.suggestions).toEqual([mockSuggestion])
      expect(getPopularSuggestions).toHaveBeenCalledWith(20)
    })

    it('should return popular suggestions when query is too short', async () => {
      vi.mocked(getPopularSuggestions).mockResolvedValue([mockSuggestion])

      const res = await request(app)
        .get('/suggestions?q=a')
        .set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(res.status).toBe(200)
      expect(getPopularSuggestions).toHaveBeenCalled()
      expect(getGroupedSearchSuggestions).not.toHaveBeenCalled()
    })

    it('should return flat suggestions for a valid query', async () => {
      vi.mocked(getGroupedSearchSuggestions).mockResolvedValue({ face: [mockSuggestion] })

      const res = await request(app)
        .get('/suggestions?q=pe')
        .set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(res.status).toBe(200)
      expect(res.body.suggestions).toHaveLength(1)
      expect(res.body.suggestions).toEqual([mockSuggestion])
      expect(getGroupedSearchSuggestions).toHaveBeenCalledWith('pe')
    })

    it('should return 400 when query exceeds 100 characters', async () => {
      const longQuery = 'a'.repeat(101)

      const res = await request(app)
        .get(`/suggestions?q=${longQuery}`)
        .set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Query too long')
    })

    it('should return 401 with no auth token', async () => {
      const res = await request(app).get('/suggestions')
      expect(res.status).toBe(401)
    })

    it('should return 403 when token lacks videos_read scope', async () => {
      const noScopeToken = 'no-scope-suggestions'
      const noScopeHash = crypto.createHash('sha256').update(noScopeToken).digest('hex')
      const user = [...mockDatabase.User.data.values()][0]
      await mockDatabase.AccessToken.create({
        userId: user.id,
        tokenHash: noScopeHash,
        scopes: [],
        allowedIps: ['*'],
      })

      const res = await request(app)
        .get('/suggestions')
        .set('Authorization', `Bearer ${noScopeToken}`)

      expect(res.status).toBe(403)
    })

    it('should handle service errors gracefully', async () => {
      vi.mocked(getPopularSuggestions).mockRejectedValue(new Error('Redis down'))

      const res = await request(app)
        .get('/suggestions')
        .set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(res.status).toBe(500)
      expect(res.body.error).toBe('Failed to get suggestions')
    })
  })
})
