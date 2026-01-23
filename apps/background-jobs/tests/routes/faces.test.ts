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
  faceLabellingQueue: {
    add: vi.fn(),
    getActive: vi.fn().mockResolvedValue([]),
    getWaiting: vi.fn().mockResolvedValue([]),
    getDelayed: vi.fn().mockResolvedValue([]),
  },
  faceRenameQueue: {
    add: vi.fn(),
  },
  faceDeletionQueue: {
    add: vi.fn(),
    getActive: vi.fn().mockResolvedValue([]),
    getWaiting: vi.fn().mockResolvedValue([]),
    getDelayed: vi.fn().mockResolvedValue([]),
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

import facesRouter from '../../src/routes/faces'
import { requireAuth } from '@background-jobs/middleware/auth'
import { createJWTService } from '@shared/services/jwt'
import { faceLabellingQueue, faceRenameQueue, faceDeletionQueue } from '@background-jobs/queue'
import { env } from '@background-jobs/utils/env'
import { User } from '@prisma/client'
import { createMockJob } from '../mocks/bullmq'

describe('Faces API Routes', () => {
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
    app.use('/faces', requireAuth, facesRouter)
  })

  afterEach(() => {
    clearAllMockModels()
  })

  describe('PATCH /faces', () => {
    it('should queue face labelling job', async () => {
      const mockJob = createMockJob('labelling-job-123', 'face-labelling')
      vi.mocked(faceLabellingQueue.add).mockResolvedValue(mockJob)

      const response = await request(app)
        .patch('/faces')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'John Doe',
          faces: [
            {
              jsonFile: '/path/to/face1.json',
              faceId: 'face-1',
            },
            {
              jsonFile: '/path/to/face2.json',
              faceId: 'face-2',
            },
          ],
        })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        message: 'Face labelling job queued',
      })
      expect(faceLabellingQueue.add).toHaveBeenCalledWith('face-labelling', {
        name: 'John Doe',
        faces: expect.arrayContaining([
          expect.objectContaining({
            jsonFile: '/path/to/face1.json',
          }),
        ]),
      })
    })

    it('should return 401 without authentication', async () => {
      const response = await request(app).patch('/faces').send({
        name: 'John Doe',
        faces: [],
      })

      expect(response.status).toBe(401)
    })

    it('should return 400 when faces array is empty', async () => {
      const response = await request(app).patch('/faces').set('Authorization', `Bearer ${authToken}`).send({
        name: 'John Doe',
        faces: [],
      })

      expect(response.status).toBe(400)
    })

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .patch('/faces')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          faces: [
            {
              jsonFile: '/path/to/face1.json',
              faceId: 'face-1',
            },
          ],
        })

      expect(response.status).toBe(400)
    })

    it('should return 400 when faces array is missing', async () => {
      const response = await request(app).patch('/faces').set('Authorization', `Bearer ${authToken}`).send({
        name: 'John Doe',
      })

      expect(response.status).toBe(400)
    })

    it('should handle queue failures', async () => {
      vi.mocked(faceLabellingQueue.add).mockRejectedValue(new Error('Queue error'))

      const response = await request(app)
        .patch('/faces')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'John Doe',
          faces: [
            {
              jsonFile: '/path/to/face1.json',
              faceId: 'face-1',
            },
          ],
        })

      expect(response.status).toBe(500)
      expect(response.body.error).toBeDefined()
    })

    it('should handle invalid token', async () => {
      const response = await request(app).patch('/faces').set('Authorization', 'Bearer invalid-token').send({
        name: 'John Doe',
        faces: [],
      })

      expect(response.status).toBe(401)
    })
  })

  describe('POST /faces/:name/rename', () => {
    it('should queue face renaming job', async () => {
      const mockJob = createMockJob('rename-job-123', 'face-renaming')
      vi.mocked(faceRenameQueue.add).mockResolvedValue(mockJob)

      const response = await request(app)
        .post('/faces/OldName/rename')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          newName: 'NewName',
        })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        message: 'Face renaming job queued',
      })
      expect(faceRenameQueue.add).toHaveBeenCalledWith('face-renaming', {
        oldName: 'OldName',
        newName: 'NewName',
      })
    })

    it('should return 401 without authentication', async () => {
      const response = await request(app).post('/faces/OldName/rename').send({
        newName: 'NewName',
      })

      expect(response.status).toBe(401)
    })

    it('should return 400 when newName is missing', async () => {
      const response = await request(app)
        .post('/faces/OldName/rename')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})

      expect(response.status).toBe(400)
    })

    it('should handle queue failures', async () => {
      vi.mocked(faceRenameQueue.add).mockRejectedValue(new Error('Queue error'))

      const response = await request(app)
        .post('/faces/OldName/rename')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          newName: 'NewName',
        })

      expect(response.status).toBe(500)
      expect(response.body.error).toBeDefined()
    })

    it('should handle special characters in face names', async () => {
      const mockJob = createMockJob('rename-job-456', 'face-renaming')
      vi.mocked(faceRenameQueue.add).mockResolvedValue(mockJob)

      const response = await request(app)
        .post('/faces/John%20Doe/rename')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          newName: 'Jane Doe',
        })

      expect(response.status).toBe(200)
      expect(faceRenameQueue.add).toHaveBeenCalled()
    })

    it('should handle invalid token', async () => {
      const response = await request(app)
        .post('/faces/OldName/rename')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          newName: 'NewName',
        })

      expect(response.status).toBe(401)
    })
  })

  describe('DELETE /faces', () => {
    it('should queue face deletion job', async () => {
      const mockJob = createMockJob('deletion-job-123', 'face-deletion')
      vi.mocked(faceDeletionQueue.add).mockResolvedValue(mockJob)

      const response = await request(app).delete('/faces').set('Authorization', `Bearer ${authToken}`).send({
        jsonFile: '/path/to/face.json',
        imageFile: '/path/to/face.jpg',
      })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        message: 'Face deletion job queued',
      })
      expect(faceDeletionQueue.add).toHaveBeenCalledWith('face-deletion', {
        jsonFile: '/path/to/face.json',
        imageFile: '/path/to/face.jpg',
      })
    })

    it('should return 401 without authentication', async () => {
      const response = await request(app).delete('/faces').send({
        jsonFile: '/path/to/face.json',
        imageFile: '/path/to/face.jpg',
      })

      expect(response.status).toBe(401)
    })

    it('should return 400 when jsonFile is missing', async () => {
      const response = await request(app).delete('/faces').set('Authorization', `Bearer ${authToken}`).send({
        imageFile: '/path/to/face.jpg',
      })

      expect(response.status).toBe(400)
    })

    it('should return 400 when imageFile is missing', async () => {
      const response = await request(app).delete('/faces').set('Authorization', `Bearer ${authToken}`).send({
        jsonFile: '/path/to/face.json',
      })

      expect(response.status).toBe(400)
    })

    it('should handle queue failures', async () => {
      vi.mocked(faceDeletionQueue.add).mockRejectedValue(new Error('Queue error'))

      const response = await request(app).delete('/faces').set('Authorization', `Bearer ${authToken}`).send({
        jsonFile: '/path/to/face.json',
        imageFile: '/path/to/face.jpg',
      })

      expect(response.status).toBe(500)
      expect(response.body.error).toBeDefined()
    })

    it('should handle invalid token', async () => {
      const response = await request(app).delete('/faces').set('Authorization', 'Bearer invalid-token').send({
        jsonFile: '/path/to/face.json',
        imageFile: '/path/to/face.jpg',
      })

      expect(response.status).toBe(401)
    })
  })

  describe('GET /faces/processing', () => {
    it('should return empty array when no processing jobs', async () => {
      vi.mocked(faceLabellingQueue.getActive).mockResolvedValue([])
      vi.mocked(faceLabellingQueue.getWaiting).mockResolvedValue([])
      vi.mocked(faceLabellingQueue.getDelayed).mockResolvedValue([])
      vi.mocked(faceDeletionQueue.getActive).mockResolvedValue([])
      vi.mocked(faceDeletionQueue.getWaiting).mockResolvedValue([])
      vi.mocked(faceDeletionQueue.getDelayed).mockResolvedValue([])

      const response = await request(app).get('/faces/processing').set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body).toEqual([])
    })

    it('should return processing face labelling jobs', async () => {
      const mockJob = createMockJob('job-123', 'face-labelling', {
        name: 'John Doe',
        faces: [
          { jsonFile: '/path/to/face1.json', faceId: 'face-1' },
          { jsonFile: '/path/to/face2.json', faceId: 'face-2' },
        ],
      })

      vi.mocked(faceLabellingQueue.getActive).mockResolvedValue([mockJob])
      vi.mocked(faceLabellingQueue.getWaiting).mockResolvedValue([])
      vi.mocked(faceLabellingQueue.getDelayed).mockResolvedValue([])
      vi.mocked(faceDeletionQueue.getActive).mockResolvedValue([])
      vi.mocked(faceDeletionQueue.getWaiting).mockResolvedValue([])
      vi.mocked(faceDeletionQueue.getDelayed).mockResolvedValue([])

      const response = await request(app).get('/faces/processing').set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body).toHaveLength(2)
      expect(response.body[0]).toMatchObject({
        queue: 'face-labelling',
        jobId: 'job-123',
        status: 'waiting',
        jsonFile: '/path/to/face1.json',
      })
    })

    it('should return processing face deletion jobs', async () => {
      const mockJob = createMockJob('job-456', 'face-deletion', {
        jsonFile: '/path/to/face.json',
        imageFile: '/path/to/face.jpg',
      })

      vi.mocked(faceLabellingQueue.getActive).mockResolvedValue([])
      vi.mocked(faceLabellingQueue.getWaiting).mockResolvedValue([])
      vi.mocked(faceLabellingQueue.getDelayed).mockResolvedValue([])
      vi.mocked(faceDeletionQueue.getActive).mockResolvedValue([mockJob])
      vi.mocked(faceDeletionQueue.getWaiting).mockResolvedValue([])
      vi.mocked(faceDeletionQueue.getDelayed).mockResolvedValue([])

      const response = await request(app).get('/faces/processing').set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body).toHaveLength(1)
      expect(response.body[0]).toMatchObject({
        queue: 'face-deletion',
        jobId: 'job-456',
        status: 'waiting',
        jsonFile: '/path/to/face.json',
      })
    })

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/faces/processing')

      expect(response.status).toBe(401)
    })

    it('should handle queue errors gracefully', async () => {
      vi.mocked(faceLabellingQueue.getActive).mockRejectedValue(new Error('Queue error'))

      const response = await request(app).get('/faces/processing').set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Failed to fetch processing faces')
    })

    it('should handle invalid token', async () => {
      const response = await request(app).get('/faces/processing').set('Authorization', 'Bearer invalid-token')

      expect(response.status).toBe(401)
    })
  })
})
