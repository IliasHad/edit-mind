import request from 'supertest'
import express, { Express } from 'express'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import crypto from 'crypto'
import { clearAllMockModels, mockDatabase } from '../setup'

const RAW_TOKEN = 'test-access-token-media'
const TOKEN_HASH = crypto.createHash('sha256').update(RAW_TOKEN).digest('hex')

vi.mock('@db/models/AccessToken', () => ({
  AccessTokenModel: mockDatabase.AccessToken,
}))

vi.mock('@shared/services/pathValidator', () => ({
  createPathValidator: vi.fn(() => ({
    validatePath: vi.fn(() => ({ isValid: true })),
  })),
}))

vi.mock('@shared/constants', () => ({
  MEDIA_BASE_PATH: '/media/videos',
  THUMBNAILS_DIR: '/thumbnails',
}))

vi.mock('@shared/services/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

vi.mock('fs/promises', () => ({
  default: { stat: vi.fn() },
}))

import mediaRouter from '../../src/routes/api/media'
import { requireAccessToken } from '../../src/middleware/accessTokenAuth'
import fsPromises from 'fs/promises'
import { createPathValidator } from '@shared/services/pathValidator'

describe('API Media Routes', () => {
  let app: Express

  beforeEach(async () => {
    clearAllMockModels()
    vi.clearAllMocks()

    // vi.clearAllMocks() doesn't reset mockReturnValue, so re-establish the default
    // here to prevent the 403 test's override from leaking into subsequent tests.
    vi.mocked(createPathValidator).mockReturnValue({
      validatePath: vi.fn(() => ({ isValid: true })),
    })

    const user = await mockDatabase.User.create({ email: 'test@example.com' })
    await mockDatabase.AccessToken.create({
      userId: user.id,
      tokenHash: TOKEN_HASH,
      scopes: ['media_read'],
      allowedIps: ['*'],
    })

    app = express()
    app.use(express.json())
    app.use('/media', requireAccessToken, mediaRouter)
  })

  afterEach(() => {
    clearAllMockModels()
  })

  describe('GET /media', () => {
    it('should return 400 when source param is missing', async () => {
      const res = await request(app).get('/media').set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Missing source query parameter')
    })

    it('should return 403 when path validation fails', async () => {
      vi.mocked(createPathValidator).mockReturnValue({
        validatePath: vi.fn(() => ({ isValid: false, error: 'Path outside base' })),
      } as never)

      const res = await request(app)
        .get('/media?source=%2Fetc%2Fpasswd')
        .set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(res.status).toBe(403)
      expect(res.body.error).toBe('Access denied')
    })

    it('should return 404 when file does not exist', async () => {
      vi.mocked(fsPromises.stat).mockRejectedValue(
        Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' })
      )

      const source = encodeURIComponent('/media/videos/missing.mp4')
      const res = await request(app)
        .get(`/media?source=${source}`)
        .set('Authorization', `Bearer ${RAW_TOKEN}`)

      expect(res.status).toBe(404)
      expect(res.body.error).toBe('File not found')
    })

    // Streaming test omitted: Vitest does not reliably intercept `import fs from 'fs'`
    // (default CJS import) inside the route, so createReadStream cannot be mocked at
    // this level. The 200 path is exercised by integration/e2e tests instead.

    it('should return 401 with no auth token', async () => {
      const res = await request(app).get('/media?source=%2Fmedia%2Ftest.mp4')
      expect(res.status).toBe(401)
    })

    it('should return 403 when token lacks media_read scope', async () => {
      const noScopeToken = 'no-scope-media'
      const noScopeHash = crypto.createHash('sha256').update(noScopeToken).digest('hex')
      const user = [...mockDatabase.User.data.values()][0]
      await mockDatabase.AccessToken.create({
        userId: user.id,
        tokenHash: noScopeHash,
        scopes: [],
        allowedIps: ['*'],
      })

      const res = await request(app)
        .get('/media?source=%2Fmedia%2Ftest.mp4')
        .set('Authorization', `Bearer ${noScopeToken}`)

      expect(res.status).toBe(403)
    })
  })
})
