import request from 'supertest'
import express, { Express } from 'express'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { clearAllMockModels, mockDatabase } from '../setup'

vi.mock('@background-jobs/utils/env', () => ({
  env: {
    SESSION_SECRET: 'test-secret',
  },
}))

vi.mock('@background-jobs/services/videoIndexer', () => ({
  addVideoIndexingJob: vi.fn(),
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
  FolderModel: mockDatabase.Folder,
  JobModel: mockDatabase.Job,
}))

vi.mock('@db/models/User', () => ({
  UserModel: mockDatabase.User,
}))

vi.mock('fs/promises', () => ({
  stat: vi.fn(),
}))

import indexerRouter from '../../src/routes/indexer'
import { requireAuth } from '@background-jobs/middleware/auth'
import { createJWTService } from '@shared/services/jwt'
import { addVideoIndexingJob } from '@background-jobs/services/videoIndexer'
import { env } from '@background-jobs/utils/env'
import { User } from '@prisma/client'

describe('Indexer API Routes', () => {
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
    app.use('/indexer', requireAuth, indexerRouter)
  })

  afterEach(() => {
    clearAllMockModels()
  })

  describe('POST /indexer/reindex', () => {
    it('should queue video reindexing job with existing jobId', async () => {
      const job = await mockDatabase.Job.create({
        userId: testUser.id,
        videoPath: '/test/video.mp4',
        status: 'done',
      })

      vi.mocked(addVideoIndexingJob).mockResolvedValue(undefined)

      const response = await request(app)
        .post('/indexer/reindex')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId: job.id,
          videoPath: '/test/video.mp4',
        })

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: 'Video indexer job queued',
        jobId: job.id,
      })
      expect(addVideoIndexingJob).toHaveBeenCalledWith(
        {
          videoPath: '/test/video.mp4',
          jobId: job.id,
          forceReIndexing: false,
        },
        0
      )
    })

    it('should return 400 when videoPath is missing and no jobId', async () => {
      const response = await request(app)
        .post('/indexer/reindex')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})

      expect(response.status).toBe(400)
    })

    it('should queue job with forceReIndexing flag', async () => {
      const job = await mockDatabase.Job.create({
        userId: testUser.id,
        videoPath: '/test/video.mp4',
        status: 'done',
      })

      vi.mocked(addVideoIndexingJob).mockResolvedValue(undefined)

      const response = await request(app)
        .post('/indexer/reindex')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId: job.id,
          videoPath: '/test/video.mp4',
          forceReIndexing: true,
        })

      expect(response.status).toBe(200)
      expect(addVideoIndexingJob).toHaveBeenCalledWith(
        {
          videoPath: '/test/video.mp4',
          jobId: job.id,
          forceReIndexing: true,
        },
        0
      )
    })

    it('should queue job with priority', async () => {
      const job = await mockDatabase.Job.create({
        userId: testUser.id,
        videoPath: '/test/video.mp4',
        status: 'done',
      })

      vi.mocked(addVideoIndexingJob).mockResolvedValue(undefined)

      const response = await request(app)
        .post('/indexer/reindex')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId: job.id,
          videoPath: '/test/video.mp4',
          priority: 10,
        })

      expect(response.status).toBe(200)
      expect(addVideoIndexingJob).toHaveBeenCalledWith(
        {
          videoPath: '/test/video.mp4',
          jobId: job.id,
          forceReIndexing: false,
        },
        10
      )
    })

    it('should return 400 with invalid request body', async () => {
      const response = await request(app)
        .post('/indexer/reindex')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          invalidField: 'value',
        })

      expect(response.status).toBe(400)
    })

    it('should return 500 when jobId not found', async () => {
      const response = await request(app)
        .post('/indexer/reindex')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId: 'non-existent-job-id',
          videoPath: '/test/video.mp4',
        })

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Failed to queue video indexer job')
    })

    it('should handle queue failures', async () => {
      const job = await mockDatabase.Job.create({
        userId: testUser.id,
        videoPath: '/test/video.mp4',
        status: 'done',
      })

      vi.mocked(addVideoIndexingJob).mockRejectedValue(new Error('Queue error'))

      const response = await request(app)
        .post('/indexer/reindex')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId: job.id,
          videoPath: '/test/video.mp4',
        })

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Failed to queue video indexer job')
    })

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/indexer/reindex')
        .send({
          jobId: 'job-123',
          videoPath: '/test/video.mp4',
        })

      expect(response.status).toBe(401)
    })

    it('should handle invalid token', async () => {
      const response = await request(app)
        .post('/indexer/reindex')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          jobId: 'job-123',
          videoPath: '/test/video.mp4',
        })

      expect(response.status).toBe(401)
    })

    it('should handle both jobId and videoPath provided', async () => {
      const job = await mockDatabase.Job.create({
        userId: testUser.id,
        videoPath: '/test/video.mp4',
        status: 'done',
      })

      vi.mocked(addVideoIndexingJob).mockResolvedValue(undefined)

      const response = await request(app)
        .post('/indexer/reindex')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId: job.id,
          videoPath: '/test/video.mp4',
          forceReIndexing: true,
          priority: 5,
        })

      expect(response.status).toBe(200)
      expect(response.body.jobId).toBe(job.id)
      expect(addVideoIndexingJob).toHaveBeenCalledWith(
        {
          videoPath: '/test/video.mp4',
          jobId: job.id,
          forceReIndexing: true,
        },
        5
      )
    })
  })
})
