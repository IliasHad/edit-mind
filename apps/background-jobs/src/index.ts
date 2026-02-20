import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'
import foldersRoute from './routes/folders'
import chatsRoute from './routes/chats'
import exportsRoute from './routes/exports'
import facesRoute from './routes/faces'
import indexerRoute from './routes/indexer'
import immichRoute from './routes/immich'
import prisma from '@db/db'
import { requireAuth } from './middleware/auth'

import {
  faceLabellingQueue,
  immichImporterQueue,
  smartCollectionQueue,
  videoStitcherQueue,
  chatQueue,
  exportQueue,
  transcriptionQueue,
  frameAnalysisQueue,
  sceneCreationQueue,
  textEmbeddingQueue,
  audioEmbeddingQueue,
  visualEmbeddingQueue,
  faceDeletionQueue,
  videoFinalizationQueue,
  faceRenameQueue,
} from './queue'

import './jobs/transcription'
import './jobs/frameAnalysis'
import './jobs/sceneCreation'
import './jobs/textEmbedding'
import './jobs/audioEmbedding'
import './jobs/visualEmbedding'
import './jobs/videoFinalization'
import './jobs/ImmichImporter'
import './jobs/videoStitcher'
import './jobs/faceLabelling'
import './jobs/faceDeletion'
import './jobs/smartCollection'
import './jobs/chat'
import './jobs/export'
import './jobs/faceRenaming'

import { initializeWatchers } from './watcher'
import { shutdownWorkers } from './utils/workers'
import { logger } from '@shared/services/logger'
import { env } from '@background-jobs/utils/env'
import { SMART_COLLECTION_CRON_PATTERN } from '@smart-collections/constants/collections'
import { rateLimiter } from './middleware/rateLimiter'
import { checkServicesStatus } from './websockets'
import { suggestionCache } from '@search/services/suggestion'

const app = express()
const server = createServer(app)
export const io = new Server(server, {
  cors: {
    origin: env.WEB_APP_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

app.use(cors())
app.use(express.json())

if (process.env.NODE_ENV === 'development') {
  const serverAdapter = new ExpressAdapter()
  serverAdapter.setBasePath('/')

  createBullBoard({
    queues: [
      new BullMQAdapter(transcriptionQueue),
      new BullMQAdapter(frameAnalysisQueue),
      new BullMQAdapter(sceneCreationQueue),
      new BullMQAdapter(textEmbeddingQueue),
      new BullMQAdapter(audioEmbeddingQueue),
      new BullMQAdapter(visualEmbeddingQueue),
      new BullMQAdapter(videoFinalizationQueue),
      new BullMQAdapter(videoStitcherQueue),
      new BullMQAdapter(faceLabellingQueue),
      new BullMQAdapter(faceDeletionQueue),
      new BullMQAdapter(faceRenameQueue),
      new BullMQAdapter(smartCollectionQueue),
      new BullMQAdapter(chatQueue),
      new BullMQAdapter(exportQueue),
      new BullMQAdapter(immichImporterQueue),
    ],
    serverAdapter,
  })

  app.use('/', serverAdapter.getRouter())
}

// API endpoints that will be used only from the web app to handle background jobs
// API requests should include authorization header with userId and email using JWT
app.use(
  cors({
    origin: env.WEB_APP_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

app.use('/internal/folders', requireAuth, rateLimiter, foldersRoute)
app.use('/internal/chats', requireAuth, rateLimiter, chatsRoute)
app.use('/internal/exports', requireAuth, rateLimiter, exportsRoute)
app.use('/internal/faces', requireAuth, rateLimiter, facesRoute)
app.use('/internal/indexer', requireAuth, rateLimiter, indexerRoute)
app.use('/internal/immich', requireAuth, rateLimiter, immichRoute)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

server.listen(env.BACKGROUND_JOBS_PORT, async () => {
  await prisma.$connect()
  await initializeWatchers()
  await suggestionCache.initialize()

  const collectionJobId = 'generate-smart-collections-cron'

  // Remove existing repeatable job before adding a new one
  await smartCollectionQueue.remove(collectionJobId)

  await smartCollectionQueue.add(
    'smart-collections',
    {},
    {
      repeat: {
        pattern: SMART_COLLECTION_CRON_PATTERN,
      },
      jobId: collectionJobId,
    }
  )

  logger.debug(`Background jobs server running on port ${env.BACKGROUND_JOBS_PORT}`)
  if (process.env.NODE_ENV === 'development') {
    logger.warn(`Bull Board UI available at http://localhost:${env.BACKGROUND_JOBS_PORT}`)
  }
  logger.debug('WebSocket server initialized and ready for connections')
})

io.on('connection', async (socket) => {
  logger.debug("WebSocket client connected")

 
  // Send initial status
  const status = await checkServicesStatus()
  socket.emit('service-status', status)

  // Handle status check requests
  socket.on('request-status', async () => {
    const status = await checkServicesStatus()
    socket.emit('service-status', status)
  })

  socket.on('disconnect', () => {
    logger.debug("WebSocket client disconnected")
  })
})

process.on('SIGTERM', async () => {
  io.close()
  await shutdownWorkers()
})

process.on('SIGINT', async () => {
  io.close()
  await shutdownWorkers()
})