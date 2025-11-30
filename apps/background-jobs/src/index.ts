import express from 'express'
import cors from 'cors'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'
import foldersRoute from './routes/folders'
import stitcherRoute from './routes/stitcher'
import { config } from './config'
import { faceMatcherQueue, immichImporterQueue, videoQueue, videoStitcherQueue, yearInReviewQueue } from './queue'
import './jobs/videoIndexer'
import './jobs/faceMatcher'
import './jobs/ImmichImporter'
import './jobs/videoStitcher'
import './jobs/yearInReview'

import { pythonService } from '@shared/services/pythonService'
import { initializeWatchers } from './watcher'
import { suggestionCache } from '@shared/services/suggestion'

const app = express()

app.use(cors())
app.use(express.json())

if (process.env.NODE_ENV === 'development') {
  const serverAdapter = new ExpressAdapter()
  serverAdapter.setBasePath('/')

  createBullBoard({
    queues: [
      new BullMQAdapter(videoQueue),
      new BullMQAdapter(faceMatcherQueue),
      new BullMQAdapter(immichImporterQueue),
      new BullMQAdapter(videoStitcherQueue),
      new BullMQAdapter(yearInReviewQueue),
    ],
    serverAdapter,
  })

  app.use('/', serverAdapter.getRouter())
}

app.use('/folders', foldersRoute)
app.use('/stitcher', stitcherRoute)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.listen(config.port, async () => {
  await pythonService.start()
  await initializeWatchers()
  await suggestionCache.initialize()
  console.warn(`Server running on port ${config.port}`)
  if (process.env.NODE_ENV === 'development') {
    console.warn(`Bull Board UI available at http://localhost:${config.port}`)
  }
})
