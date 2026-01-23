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
  chatQueue: {
    add: vi.fn(),
  },
  videoStitcherQueue: {
    add: vi.fn(),
  },
}))

vi.mock('@shared/services/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@db/index', () => ({
  ChatModel: mockDatabase.Chat,
}))

vi.mock('@db/models/User', () => ({
  UserModel: mockDatabase.User,
}))

import chatsRouter from '../../src/routes/chats'
import { requireAuth } from '@background-jobs/middleware/auth'
import { createJWTService } from '@shared/services/jwt'
import { chatQueue, videoStitcherQueue } from '@background-jobs/queue'
import { env } from '@background-jobs/utils/env'
import { Chat, User } from '@prisma/client'
import { createMockJob } from '../mocks/bullmq'

describe('Chat API Routes', () => {
  let app: Express
  let testUser: User
  let testChat: Chat
  let authToken: string
  const jwtService = createJWTService(env.SESSION_SECRET)

  beforeEach(async () => {
    // Clear all mocks
    clearAllMockModels()
    vi.clearAllMocks()

    // Create test user and chat
    testUser = await mockDatabase.User.create({
      email: 'test@example.com',
      name: 'Test User',
    })

    testChat = await mockDatabase.Chat.create({
      userId: testUser.id,
      title: 'Test Chat',
    })

    // Generate auth token
    authToken = jwtService.encode({ userId: testUser.id, email: testUser.email })

    // Setup Express app
    app = express()
    app.use(express.json())
    app.use('/chats', requireAuth, chatsRouter)
  })

  afterEach(() => {
    clearAllMockModels()
  })

  describe('POST /chats/:id/messages', () => {
    it('should successfully queue a chat message job', async () => {
      const mockJob = createMockJob('job-123', 'chat-message', {})

      vi.mocked(chatQueue.add).mockResolvedValue(mockJob)

      const response = await request(app)
        .post(`/chats/${testChat.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'Test prompt',
          projectId: 'project-123',
        })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        message: 'Chat message job queued',
        jobId: 'job-123',
      })
      expect(chatQueue.add).toHaveBeenCalledWith('process-chat-message', {
        chatId: testChat.id,
        prompt: 'Test prompt',
        projectId: 'project-123',
      })
    })

    it('should return 401 when no auth token provided', async () => {
      const response = await request(app).post(`/chats/${testChat.id}/messages`).send({
        prompt: 'Test prompt',
        projectId: 'project-123',
      })

      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Unauthorized')
    })

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .post(`/chats/${testChat.id}/messages`)
        .set('Authorization', 'Bearer invalid-token')
        .send({
          prompt: 'Test prompt',
          projectId: 'project-123',
        })

      expect(response.status).toBe(401)
      expect(response.body.message).toBe('Invalid token')
    })

    it('should return 400 with invalid request body', async () => {
      const response = await request(app)
        .post(`/chats/${testChat.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          invalidField: 'value',
        })

      expect(response.status).toBe(400)
    })

    it('should handle missing prompt field', async () => {
      const response = await request(app)
        .post(`/chats/${testChat.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: 'project-123',
          // Missing prompt
        })

      expect(response.status).toBe(400)
    })

    it('should handle queue failures gracefully', async () => {
      vi.mocked(chatQueue.add).mockRejectedValue(new Error('Queue error'))

      const response = await request(app)
        .post(`/chats/${testChat.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'Test prompt',
          projectId: 'project-123',
        })

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Failed to queue chat message job')
    })

    it('should handle non-existent chat', async () => {
      const mockJob = createMockJob('job-123', 'chat-message', {})
      vi.mocked(chatQueue.add).mockResolvedValue(mockJob)

      const response = await request(app)
        .post('/chats/non-existent-id/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'Test prompt',
          projectId: 'project-123',
        })

      expect(response.status).toBe(200)
      expect(chatQueue.add).toHaveBeenCalledWith('process-chat-message', {
        chatId: undefined,
        prompt: 'Test prompt',
        projectId: 'project-123',
      })
    })
  })

  describe('POST /chats/:id/stitcher', () => {
    it('should successfully queue a video stitching job', async () => {
      const mockJob = createMockJob('123', 'stitcher', { id: 'stitch-job-123' })

      vi.mocked(videoStitcherQueue.add).mockResolvedValue(mockJob)

      const response = await request(app)
        .post(`/chats/${testChat.id}/stitcher`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          selectedSceneIds: ['scene-1', 'scene-2', 'scene-3'],
          messageId: 'message-123',
        })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        message: 'Video stitching job queued',
      })
      expect(videoStitcherQueue.add).toHaveBeenCalledWith('stitch-video', {
        selectedSceneIds: ['scene-1', 'scene-2', 'scene-3'],
        messageId: 'message-123',
        chatId: testChat.id,
      })
    })

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post(`/chats/${testChat.id}/stitcher`)
        .send({
          selectedSceneIds: ['scene-1'],
          messageId: 'message-123',
        })

      expect(response.status).toBe(401)
    })

    it('should handle empty selectedSceneIds array', async () => {
      const mockJob = createMockJob('stitch-job-12', 'stitcher', {})

      vi.mocked(videoStitcherQueue.add).mockResolvedValue(mockJob)

      const response = await request(app)
        .post(`/chats/${testChat.id}/stitcher`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          selectedSceneIds: [],
          messageId: 'message-123',
        })

      expect(response.status).toBe(400)
    })

    it('should handle queue failures', async () => {
      vi.mocked(videoStitcherQueue.add).mockRejectedValue(new Error('Stitcher queue error'))

      const response = await request(app)
        .post(`/chats/${testChat.id}/stitcher`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          selectedSceneIds: ['scene-1'],
          messageId: 'message-123',
        })

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Failed to queue video stitching job')
    })

    it('should handle missing request body fields', async () => {
      const mockJob = createMockJob('123', 'stitcher', { id: 'stitch-job-123' })

      vi.mocked(videoStitcherQueue.add).mockResolvedValue(mockJob)

      const response = await request(app)
        .post(`/chats/${testChat.id}/stitcher`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})

      expect(response.status).toBe(400)
      expect(videoStitcherQueue.add).not.toHaveBeenCalledWith('stitch-video', {
        selectedSceneIds: undefined,
        messageId: undefined,
        chatId: testChat.id,
      })
    })
  })
})
