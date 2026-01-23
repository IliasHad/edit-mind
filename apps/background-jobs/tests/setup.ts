import express, { Express, Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import { MockQueue } from './mocks/bullmq'
import { mockDatabase, clearAllMockModels } from './mocks/database'
import { generateValidToken, MockJWTService, getTestSecret } from './mocks/jwt'
import { AuthenticatedRequest } from '@background-jobs/middleware/auth'
import { JWTExpiredError, JWTInvalidError } from '@shared/services/jwt'
import { Chat, ChatMessage, Collection, Export, Folder, Job, User } from '@prisma/client'

/**
 * Test environment configuration
 */
export const TEST_ENV = {
  SESSION_SECRET: getTestSecret(),
  WEB_APP_URL: 'http://localhost:3745',
  BACKGROUND_JOBS_PORT: 4000,
}

/**
 * Mock queues for testing
 */
export const mockQueues = {
  chatQueue: new MockQueue('chat-message'),
  videoStitcherQueue: new MockQueue('video-stitcher'),
  exportQueue: new MockQueue('export-scenes'),
  faceLabellingQueue: new MockQueue('face-labelling'),
  faceRenameQueue: new MockQueue('face-renaming'),
  faceDeletionQueue: new MockQueue('face-deletion'),
  immichImporterQueue: new MockQueue('immich-importer'),
  transcriptionQueue: new MockQueue('transcription'),
  frameAnalysisQueue: new MockQueue('frame-analysis'),
  sceneCreationQueue: new MockQueue('scene-creation'),
  textEmbeddingQueue: new MockQueue('text-embedding'),
  audioEmbeddingQueue: new MockQueue('audio-embedding'),
  visualEmbeddingQueue: new MockQueue('visual-embedding'),
  videoFinalizationQueue: new MockQueue('video-finalization'),
  smartCollectionQueue: new MockQueue('smart-collection'),
}

/**
 * Create a test Express app with all middleware and routes configured
 */
export function createTestApp(): Express {
  const app = express()

  // Middleware
  app.use(cors())
  app.use(express.json())

  // Mock authentication middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization']
    if (!authHeader) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided',
      })
      return
    }

    const jwtService = new MockJWTService(TEST_ENV.SESSION_SECRET)
    const token = jwtService.extractFromHeader(authHeader)

    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token',
      })
      return
    }

    try {
      const decoded = jwtService.verify(token)

      if (!decoded.userId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid token payload',
        })
        return
      }

      // Check if user exists in mock database
      const user = mockDatabase.User.data.get(decoded.userId)
      if (!user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not found',
        })
        return
      }

      ;(req as AuthenticatedRequest).userId = decoded.userId
      next()
    } catch (error) {
      if (error instanceof JWTInvalidError) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid token',
        })
        return
      }

      if (error instanceof JWTExpiredError) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Token expired',
        })
        return
      }
    }
  })

  // Mock rate limiter middleware
  const requestCounts = new Map<string, number>()
  app.use((req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown'
    const count = (requestCounts.get(ip) || 0) + 1
    requestCounts.set(ip, count)

    if (count > 100) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Too many requests from this IP, please try again later.',
      })
      return
    }

    next()
  })

  // Health check endpoint
  app.get('/health', (_req, res) => res.json({ status: 'ok' }))

  // Register route handlers (these will be mocked in tests)
  // Routes are registered here as placeholders - actual route logic will be tested separately
  app.use('/internal/chats', (_req: Request, res: Response) => {
    // Route handler will be mocked in tests
    res.status(404).json({ error: 'Not found' })
  })

  app.use('/internal/exports', (_req: Request, res: Response) => {
    // Route handler will be mocked in tests
    res.status(404).json({ error: 'Not found' })
  })

  app.use('/internal/faces', (_req: Request, res: Response) => {
    // Route handler will be mocked in tests
    res.status(404).json({ error: 'Not found' })
  })

  app.use('/internal/indexer', (_req: Request, res: Response) => {
    // Route handler will be mocked in tests
    res.status(404).json({ error: 'Not found' })
  })

  app.use('/internal/folders', (_req: Request, res: Response) => {
    // Route handler will be mocked in tests
    res.status(404).json({ error: 'Not found' })
  })

  app.use('/internal/immich', (_req: Request, res: Response) => {
    // Route handler will be mocked in tests
    res.status(404).json({ error: 'Not found' })
  })

  return app
}

/**
 * Test data factories
 */
export function createTestUser(overrides?: Partial<User>) {
  const userId = uuidv4()
  return {
    id: userId,
    email: `test-${userId}@example.com`,
    name: 'Test User',
    ...overrides,
  }
}

export function createTestChat(userId: string, overrides?: Partial<Chat>) {
  return {
    id: uuidv4(),
    userId,
    title: 'Test Chat',
    ...overrides,
  }
}

export function createTestExport(userId: string, overrides?: Partial<Export>) {
  return {
    id: uuidv4(),
    userId,
    sceneIds: [uuidv4()],
    name: 'Test Export',
    status: 'created' as const,
    ...overrides,
  }
}

export function createTestCollection(userId: string, overrides?: Partial<Collection>) {
  return {
    id: uuidv4(),
    userId,
    name: 'Test Collection',
    ...overrides,
  }
}

export function createTestFolder(userId: string, overrides?: Partial<Folder>) {
  return {
    id: uuidv4(),
    userId,
    path: '/test/folder',
    name: 'Test Folder',
    ...overrides,
  }
}

export function createTestChatMessage(chatId: string, overrides?: Partial<ChatMessage>) {
  return {
    id: uuidv4(),
    chatId,
    content: 'Test message',
    role: 'user' as const,
    ...overrides,
  }
}

export function createTestJob(userId: string, overrides?: Partial<Job>) {
  return {
    id: uuidv4(),
    userId,
    type: 'test',
    status: 'pending',
    ...overrides,
  }
}

/**
 * Assertion helpers
 */
export function expectQueuedJob(queue: MockQueue, jobName: string, expectedData?: Record<string, string>) {
  const jobs = queue.getJobs()
  const job = jobs.find((j) => j.name === jobName)

  if (!job) {
    throw new Error(`Expected job with name "${jobName}" to be queued, but it was not found`)
  }

  if (expectedData) {
    for (const [key, value] of Object.entries(expectedData)) {
      if (job.data[key] !== value) {
        throw new Error(`Expected job data.${key} to be ${value}, but got ${job.data[key]}`)
      }
    }
  }

  return job
}

/**
 * Helper to setup a test user and return auth token
 */
export async function setupTestUserWithToken(overrides?: Partial<User>) {
  const user = createTestUser(overrides)
  await mockDatabase.User.create(user)
  const token = generateValidToken(user.id, user.email)
  return { user, token }
}

/**
 * Helper to setup a test chat with user
 */
export async function setupTestChatWithUser(overrides?: Partial<Chat>) {
  const { user, token } = await setupTestUserWithToken()
  const chat = createTestChat(user.id, overrides)
  await mockDatabase.Chat.create(chat)
  return { user, chat, token }
}

/**
 * Helper to setup a test export with user
 */
export async function setupTestExportWithUser(overrides?: Partial<Export>) {
  const { user, token } = await setupTestUserWithToken()
  const exp = createTestExport(user.id, overrides)
  await mockDatabase.Export.create(exp)
  return { user, export: exp, token }
}

/**
 * Helper to setup a test collection with user
 */
export async function setupTestCollectionWithUser(overrides?: Partial<Collection>) {
  const { user, token } = await setupTestUserWithToken()
  const collection = createTestCollection(user.id, overrides)
  await mockDatabase.Collection.create(collection)
  return { user, collection, token }
}

/**
 * Helper to setup a test folder with user
 */
export async function setupTestFolderWithUser(overrides?: Partial<Folder>) {
  const { user, token } = await setupTestUserWithToken()
  const folder = createTestFolder(user.id, overrides)
  await mockDatabase.Folder.create(folder)
  return { user, folder, token }
}

/**
 * Helper to setup a test chat message with chat and user
 */
export async function setupTestChatMessageWithChat(overrides?: Partial<ChatMessage>) {
  const { user, chat, token } = await setupTestChatWithUser()
  const message = createTestChatMessage(chat.id, overrides)
  await mockDatabase.ChatMessage.create(message)
  return { user, chat, message, token }
}

/**
 * Clear all mocks and reset state
 */
export function clearAllMocks() {
  clearAllMockModels()

  Object.values(mockQueues).forEach((queue) => {
    queue.clear()
  })
}

/**
 * Re-export mock utilities
 */
export { mockDatabase, clearAllMockModels } from './mocks/database'
export { MockQueue } from './mocks/bullmq'
export { generateValidToken, MockJWTService, getTestSecret } from './mocks/jwt'
