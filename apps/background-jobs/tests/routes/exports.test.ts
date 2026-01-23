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
  exportQueue: {
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
  ExportModel: mockDatabase.Export,
  ChatMessageModel: mockDatabase.ChatMessage,
  CollectionModel: mockDatabase.Collection,
}))

vi.mock('@db/models/User', () => ({
  UserModel: mockDatabase.User,
}))

import exportsRouter from '../../src/routes/exports'
import { requireAuth } from '@background-jobs/middleware/auth'
import { createJWTService } from '@shared/services/jwt'
import { exportQueue } from '@background-jobs/queue'
import { env } from '@background-jobs/utils/env'
import { User } from '@prisma/client'
import { createMockJob } from '../mocks/bullmq'

describe('Exports API Routes', () => {
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
    app.use('/exports', requireAuth, exportsRouter)
  })

  afterEach(() => {
    clearAllMockModels()
  })

  describe('POST /exports', () => {
    it('should queue export job for collection', async () => {
      const collection = await mockDatabase.Collection.create({
        userId: testUser.id,
        name: 'Test Collection',
      })

      const mockJob = createMockJob('123', 'export', { id: 'export-job-123' })
      vi.mocked(exportQueue.add).mockResolvedValue(mockJob)

      const response = await request(app)
        .post('/exports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          selectedSceneIds: ['scene-1', 'scene-2'],
          collectionId: collection.id,
        })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        message: 'Export job queued',
      })
      expect(exportQueue.add).toHaveBeenCalledWith('export-scenes-collection', {
        exportId: expect.any(String),
        collectionId: collection.id,
      })
    })

    it('should queue export job for chat message', async () => {
      const chat = await mockDatabase.Chat.create({
        userId: testUser.id,
        title: 'Test Chat',
      })

      const message = await mockDatabase.ChatMessage.create({
        chatId: chat.id,
        text: 'Test message',
        sender: 'user' as const,
      })

      const mockJob = createMockJob('123', 'export', { id: 'export-job-123' })
      vi.mocked(exportQueue.add).mockResolvedValue(mockJob)

      const response = await request(app)
        .post('/exports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          selectedSceneIds: ['scene-1', 'scene-2', 'scene-3'],
          chatMessageId: message.id,
        })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        message: 'Export job queued',
      })
      expect(exportQueue.add).toHaveBeenCalledWith('export-scenes-chat-message', {
        exportId: expect.any(String),
        chatMessageId: message.id,
        chatId: chat.id,
      })
    })

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/exports')
        .send({
          selectedSceneIds: ['scene-1'],
          collectionId: 'collection-123',
        })

      expect(response.status).toBe(401)
    })

    it('should return 400 when selectedSceneIds is empty array', async () => {
      const response = await request(app).post('/exports').set('Authorization', `Bearer ${authToken}`).send({
        selectedSceneIds: [],
        collectionId: 'collection-123',
      })

      expect(response.status).toBe(400)
      expect(response.body.error).toBeDefined()
    })

    it('should return 200 when neither collectionId nor chatMessageId provided', async () => {
      const response = await request(app)
        .post('/exports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          selectedSceneIds: ['scene-1'],
        })

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('Export job queued')
    })

    it('should handle non-existent collection gracefully', async () => {
      const mockJob = createMockJob('123', 'export', { id: 'export-job-123' })

      vi.mocked(exportQueue.add).mockResolvedValue(mockJob)

      const response = await request(app)
        .post('/exports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          selectedSceneIds: ['scene-1'],
          collectionId: 'non-existent-collection',
        })

      expect(response.status).toBe(200)
      expect(exportQueue.add).not.toHaveBeenCalled()
    })

    it('should handle non-existent chat message gracefully', async () => {
      const mockJob = createMockJob('123', 'export', { id: 'export-job-123' })
      vi.mocked(exportQueue.add).mockResolvedValue(mockJob)

      const response = await request(app)
        .post('/exports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          selectedSceneIds: ['scene-1'],
          chatMessageId: 'non-existent-message',
        })

      expect(response.status).toBe(200)
      expect(exportQueue.add).not.toHaveBeenCalled()
    })

    it('should handle queue failures', async () => {
      const collection = await mockDatabase.Collection.create({
        userId: testUser.id,
        name: 'Test Collection',
      })

      vi.mocked(exportQueue.add).mockRejectedValue(new Error('Queue error'))

      const response = await request(app)
        .post('/exports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          selectedSceneIds: ['scene-1'],
          collectionId: collection.id,
        })

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Failed to queue export job')
    })

    it('should handle invalid token', async () => {
      const response = await request(app)
        .post('/exports')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          selectedSceneIds: ['scene-1'],
          collectionId: 'collection-123',
        })

      expect(response.status).toBe(401)
    })
  })
})
