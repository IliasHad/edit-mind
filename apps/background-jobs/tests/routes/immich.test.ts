import request from 'supertest'
import express, { Express } from 'express'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { clearAllMockModels, mockDatabase } from '../setup'

vi.mock('@background-jobs/utils/env', () => ({
  env: {
    SESSION_SECRET: 'test-secret',
  },
}))

vi.mock('@background-jobs/queue', () => ({
  immichImporterQueue: {
    add: vi.fn(),
  },
}))

vi.mock('@shared/services/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@db/index', () => ({
  UserModel: mockDatabase.User,
}))

vi.mock('@db/models/User', () => ({
  UserModel: mockDatabase.User,
}))

import immichRouter from '../../src/routes/immich'
import { requireAuth } from '@background-jobs/middleware/auth'
import { createJWTService } from '@shared/services/jwt'
import { immichImporterQueue } from '@background-jobs/queue'
import { env } from '@background-jobs/utils/env'
import { User } from '@prisma/client'
import { createMockJob } from '../mocks/bullmq'

describe('Immich API Routes', () => {
  let app: Express
  let testUser: User
  let authToken: string
  const jwtService = createJWTService(env.SESSION_SECRET)

  beforeEach(async () => {
    clearAllMockModels()
    vi.clearAllMocks()

    testUser = await mockDatabase.User.create({
      email: 'test@example.com',
      name: 'Test User',
    })

    authToken = jwtService.encode({ userId: testUser.id, email: testUser.email })

    app = express()
    app.use(express.json())
    app.use('/immich', requireAuth, immichRouter)
  })

  afterEach(() => {
    clearAllMockModels()
  })

  describe('POST /immich/import', () => {
    it('should queue immich import job successfully', async () => {
      const mockJob = createMockJob('immich-job-123', 'immich')

      vi.mocked(immichImporterQueue.add).mockResolvedValue(mockJob)

      const response = await request(app).post('/immich/import').set('Authorization', `Bearer ${authToken}`).send({
        integrationId: 'integration-123',
      })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        message: 'Immich import job queued successfully',
        jobId: 'immich-job-123',
      })
      expect(immichImporterQueue.add).toHaveBeenCalledWith('immich-importer', {
        integrationId: 'integration-123',
      })
    })

    it('should return 401 without authentication', async () => {
      const response = await request(app).post('/immich/import').send({
        integrationId: 'integration-123',
      })

      expect(response.status).toBe(401)
    })

    it('should return 400 when integrationId is missing', async () => {
      const response = await request(app).post('/immich/import').set('Authorization', `Bearer ${authToken}`).send({})

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Invalid request body')
    })

    it('should return 400 when integrationId is empty string', async () => {
      const response = await request(app).post('/immich/import').set('Authorization', `Bearer ${authToken}`).send({
        integrationId: '',
      })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Invalid request body')
    })

    it('should return 400 when integrationId is not a string', async () => {
      const response = await request(app).post('/immich/import').set('Authorization', `Bearer ${authToken}`).send({
        integrationId: 12345,
      })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Invalid request body')
    })

    it('should handle queue failures', async () => {
      vi.mocked(immichImporterQueue.add).mockRejectedValue(new Error('Queue error'))

      const response = await request(app).post('/immich/import').set('Authorization', `Bearer ${authToken}`).send({
        integrationId: 'integration-123',
      })

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Failed to queue Immich import job')
      expect(response.body.message).toBe('Queue error')
    })

    it('should handle invalid token', async () => {
      const response = await request(app).post('/immich/import').set('Authorization', 'Bearer invalid-token').send({
        integrationId: 'integration-123',
      })

      expect(response.status).toBe(401)
    })

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/immich/import')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json')

      expect(response.status).toBe(400)
    })

    it('should queue job with valid UUID integrationId', async () => {
      const mockJob = createMockJob('immich-job-456', 'immich')

      vi.mocked(immichImporterQueue.add).mockResolvedValue(mockJob)

      const validUUID = '550e8400-e29b-41d4-a716-446655440000'
      const response = await request(app).post('/immich/import').set('Authorization', `Bearer ${authToken}`).send({
        integrationId: validUUID,
      })

      expect(response.status).toBe(200)
      expect(immichImporterQueue.add).toHaveBeenCalledWith('immich-importer', {
        integrationId: validUUID,
      })
    })

    it('should queue job with alphanumeric integrationId', async () => {
      const mockJob = createMockJob('immich-job-789', 'immich')

      vi.mocked(immichImporterQueue.add).mockResolvedValue(mockJob)

      const response = await request(app).post('/immich/import').set('Authorization', `Bearer ${authToken}`).send({
        integrationId: 'integration_abc123',
      })

      expect(response.status).toBe(200)
      expect(immichImporterQueue.add).toHaveBeenCalledWith('immich-importer', {
        integrationId: 'integration_abc123',
      })
    })

    it('should handle extra fields in request body', async () => {
      const mockJob = createMockJob('immich-job-extra', 'immich')

      vi.mocked(immichImporterQueue.add).mockResolvedValue(mockJob)

      const response = await request(app).post('/immich/import').set('Authorization', `Bearer ${authToken}`).send({
        integrationId: 'integration-123',
        extraField: 'should be ignored',
        anotherField: 'also ignored',
      })

      expect(response.status).toBe(200)
      expect(immichImporterQueue.add).toHaveBeenCalledWith('immich-importer', {
        integrationId: 'integration-123',
      })
    })

    it('should handle queue returning job with metadata', async () => {
      const mockJob = createMockJob('immich-job-metadata', 'immich-importer', { integrationId: 'integration-123' })

      vi.mocked(immichImporterQueue.add).mockResolvedValue(mockJob)

      const response = await request(app).post('/immich/import').set('Authorization', `Bearer ${authToken}`).send({
        integrationId: 'integration-123',
      })

      expect(response.status).toBe(200)
      expect(response.body.jobId).toBe('immich-job-metadata')
    })
  })
})
