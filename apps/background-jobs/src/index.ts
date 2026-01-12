import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
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
import { env } from './utils/env'
import { SMART_COLLECTION_CRON_PATTERN } from '@smart-collections/constants/collections'

const app = express()
const server = createServer(app)

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

app.use('/internal/folders', requireAuth, foldersRoute)
app.use('/internal/chats', requireAuth, chatsRoute)
app.use('/internal/exports', requireAuth, exportsRoute)
app.use('/internal/faces', requireAuth, facesRoute)
app.use('/internal/indexer', requireAuth, indexerRoute)
app.use('/internal/immich', requireAuth, immichRoute)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

server.listen(env.BACKGROUND_JOBS_PORT, async () => {
  await prisma.$connect()
  await initializeWatchers()

  // Remove existing repeatable job before adding a new one
  const repeatableJobs = await smartCollectionQueue.getRepeatableJobs()
  for (const job of repeatableJobs) {
    if (job.id === 'generate-smart-collections-cron') {
      await smartCollectionQueue.removeRepeatableByKey(job.key)
    }
  }

  await smartCollectionQueue.add(
    'smart-collections',
    {},
    {
      repeat: {
        pattern: SMART_COLLECTION_CRON_PATTERN,
      },
      removeOnComplete: true,
      removeOnFail: true,
    }
  )

  logger.debug(`Background jobs server running on port ${env.BACKGROUND_JOBS_PORT}`)
  if (process.env.NODE_ENV === 'development') {
    logger.warn(`Bull Board UI available at http://localhost:${env.BACKGROUND_JOBS_PORT}`)
  }
})

process.on('SIGTERM', shutdownWorkers)
process.on('SIGINT', shutdownWorkers)
