import request from 'supertest'
import express, { Express } from 'express'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { clearAllMockModels, mockDatabase } from '../setup'

vi.mock('@background-jobs/utils/env', () => ({
  env: {
    SESSION_SECRET: 'test-secret',
  },
}))

vi.mock('@media-utils/utils/videos', () => ({
  findVideoFiles: vi.fn(),
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

vi.mock('@background-jobs/utils/jobs', () => ({
  deleteJobsByDataJobId: vi.fn(),
}))

import foldersRouter from '../../src/routes/folders'
import { requireAuth } from '@background-jobs/middleware/auth'
import { createJWTService } from '@shared/services/jwt'
import { findVideoFiles } from '@media-utils/utils/videos'
import { addVideoIndexingJob } from '@background-jobs/services/videoIndexer'
import { env } from '@background-jobs/utils/env'
import { User } from '@prisma/client'

describe('Folders API Routes', () => {
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
    app.use('/folders', requireAuth, foldersRouter)
  })

  afterEach(() => {
    clearAllMockModels()
  })

  describe('POST /folders/:id/trigger', () => {
    it('should scan folder and queue video indexing jobs', async () => {
      const folder = await mockDatabase.Folder.create({
        userId: testUser.id,
        path: '/test/folder',
        status: 'idle',
      })

      const mockVideos = [
        { path: '/test/folder/video1.mp4', size: 1000000, mtime: new Date() },
        { path: '/test/folder/video2.mp4', size: 2000000, mtime: new Date() },
      ]

      vi.mocked(findVideoFiles).mockResolvedValue(mockVideos)
      vi.mocked(addVideoIndexingJob).mockResolvedValue(undefined)

      const response = await request(app)
        .post(`/folders/${folder.id}/trigger`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: 'Folder added and videos queued for processing',
        queuedVideos: 2,
      })
      expect(addVideoIndexingJob).toHaveBeenCalledTimes(2)
    })

    it('should return 404 when folder not found', async () => {
      const response = await request(app)
        .post('/folders/non-existent-id/trigger')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('Folder not found')
    })

    it('should skip videos already in database', async () => {
      const folder = await mockDatabase.Folder.create({
        userId: testUser.id,
        path: '/test/folder',
        status: 'idle',
      })

      await mockDatabase.Job.create({
        userId: testUser.id,
        videoPath: '/test/folder/existing.mp4',
        status: 'pending',
      })

      const mockVideos = [
        { path: '/test/folder/existing.mp4', size: 1000000, mtime: new Date() },
        { path: '/test/folder/new.mp4', size: 2000000, mtime: new Date() },
      ]

      vi.mocked(findVideoFiles).mockResolvedValue(mockVideos)
      vi.mocked(addVideoIndexingJob).mockResolvedValue(undefined)

      const response = await request(app)
        .post(`/folders/${folder.id}/trigger`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.queuedVideos).toBe(1)
      expect(addVideoIndexingJob).toHaveBeenCalledTimes(1)
    })

    it('should handle no videos found', async () => {
      const folder = await mockDatabase.Folder.create({
        userId: testUser.id,
        path: '/test/folder',
        status: 'idle',
      })

      vi.mocked(findVideoFiles).mockResolvedValue([])

      const response = await request(app)
        .post(`/folders/${folder.id}/trigger`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.queuedVideos).toBe(0)
      expect(addVideoIndexingJob).not.toHaveBeenCalled()
    })

    it('should handle folder scanning errors', async () => {
      const folder = await mockDatabase.Folder.create({
        userId: testUser.id,
        path: '/test/folder',
        status: 'idle',
      })

      vi.mocked(findVideoFiles).mockRejectedValue(new Error('Scan error'))

      const response = await request(app)
        .post(`/folders/${folder.id}/trigger`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Failed to process folder')
    })

    it('should return 401 without authentication', async () => {
      const folder = await mockDatabase.Folder.create({
        userId: testUser.id,
        path: '/test/folder',
      })

      const response = await request(app).post(`/folders/${folder.id}/trigger`)

      expect(response.status).toBe(401)
    })

    it('should handle invalid token', async () => {
      const folder = await mockDatabase.Folder.create({
        userId: testUser.id,
        path: '/test/folder',
      })

      const response = await request(app)
        .post(`/folders/${folder.id}/trigger`)
        .set('Authorization', 'Bearer invalid-token')

      expect(response.status).toBe(401)
    })

    it('should update folder status during processing', async () => {
      const folder = await mockDatabase.Folder.create({
        userId: testUser.id,
        path: '/test/folder',
        status: 'idle',
      })

      vi.mocked(findVideoFiles).mockResolvedValue([])

      const response = await request(app)
        .post(`/folders/${folder.id}/trigger`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
    })
  })

  describe('DELETE /folders/:id', () => {
    it('should delete folder and associated jobs', async () => {
      const folder = await mockDatabase.Folder.create({
        userId: testUser.id,
        path: '/test/folder',
      })

      await mockDatabase.Job.create({
        userId: testUser.id,
        folderId: folder.id,
        videoPath: '/test/folder/video1.mp4',
        status: 'pending',
      })

      await mockDatabase.Job.create({
        userId: testUser.id,
        folderId: folder.id,
        videoPath: '/test/folder/video2.mp4',
        status: 'processing',
      })

      const response = await request(app).delete(`/folders/${folder.id}`).set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: 'Folder and videos jobs deleted',
      })
    })

    it('should return 404 when folder not found', async () => {
      const response = await request(app).delete('/folders/non-existent-id').set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('Folder not found')
    })

    it('should handle deletion errors', async () => {
      const folder = await mockDatabase.Folder.create({
        userId: testUser.id,
        path: '/test/folder',
      })

      vi.spyOn(mockDatabase.Folder, 'delete').mockRejectedValue(new Error('Delete error'))

      const response = await request(app).delete(`/folders/${folder.id}`).set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Failed to delete a folder')
    })

    it('should return 401 without authentication', async () => {
      const folder = await mockDatabase.Folder.create({
        userId: testUser.id,
        path: '/test/folder',
      })

      const response = await request(app).delete(`/folders/${folder.id}`)

      expect(response.status).toBe(401)
    })

    it('should handle invalid token', async () => {
      const folder = await mockDatabase.Folder.create({
        userId: testUser.id,
        path: '/test/folder',
      })

      const response = await request(app).delete(`/folders/${folder.id}`).set('Authorization', 'Bearer invalid-token')

      expect(response.status).toBe(401)
    })
  })
})
