import { REMOTION_COMPOSITION_ID, REMOTION_OUTPUT_VIDEOS, REMOTION_ROOT } from '@shared/constants/remotion'
import { Worker, Job } from 'bullmq'
import { connection } from '../queue'
import { logger } from '@shared/services/logger'
import { getScenesByYear } from '@shared/services/vectorDb'
import { setCache } from '@shared/services/cache'
import path from 'path'
import fs from 'fs/promises'
import { generateYearInReviewResponse } from '@shared/services/modelRouter'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { YearInReviewData } from '@shared/schemas/yearInReview'

import { createRequire } from 'node:module'

interface YearInReviewJobData {
  userId: string
  year: number
}

async function renderYearInReviewVideo(
  year: number,
  userId: string,
  data: YearInReviewData,
  job: Job<YearInReviewJobData>
): Promise<string> {
  if (!REMOTION_ROOT) {
    throw new Error('REMOTION_ROOT is not set')
  }

  const outputDir = path.resolve(REMOTION_OUTPUT_VIDEOS || path.join(REMOTION_ROOT, 'out'))
  await fs.mkdir(outputDir, { recursive: true })

  const outputName = `year-in-review-${year}-${userId}.mp4`
  const outputPath = path.join(outputDir, outputName)

  const require = createRequire(import.meta.url)

  const bundleLocation = await bundle({
    entryPoint: require.resolve(path.join(REMOTION_ROOT, 'src/index.ts')),
    webpackOverride: (config) => config,
  })

  logger.info('Selecting composition...')

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: REMOTION_COMPOSITION_ID,
    inputProps: {
      year,
      data,
    },
  })
  logger.debug('Starting to render composition')

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: data,
    chromiumOptions: {
      enableMultiProcessOnLinux: true,
    },
    onProgress: async ({ progress, renderedFrames, encodedFrames }) => {
      await job.updateProgress(progress * 100)
      logger.info({
        progress: `${(progress * 100).toFixed(2)}%`,
        renderedFrames,
        encodedFrames,
      })
    },
  })

  logger.info('Video rendered successfully')
  return outputPath
}

async function processYearInReviewJob(job: Job<YearInReviewJobData>) {
  const { userId, year } = job.data
  logger.info({ jobId: job.id, userId, year }, 'Starting Year in Review job')
  const currentYear = new Date().getFullYear()
  const cacheKey = `year:in:review:${currentYear}`

  try {
    const { videos, stats } = await getScenesByYear(currentYear)

    const topVideos = videos
      .sort((a, b) => {
        const scoreA = (a.objects?.length || 0) + (a.faces?.length || 0) + (a.emotions?.length || 0)
        const scoreB = (b.objects?.length || 0) + (b.faces?.length || 0) + (b.emotions?.length || 0)
        return scoreB - scoreA
      })
      .slice(0, 40)

    const response = await generateYearInReviewResponse(stats, topVideos, '')

    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to generate year in review')
    }
    const result = { year: currentYear, data: response.data }
    await setCache(cacheKey, result, 60 * 24 * 7)

    const videoPath = await renderYearInReviewVideo(currentYear, userId, response.data, job)
    await setCache(cacheKey, { ...result, videoPath }, 60 * 24 * 7)
    logger.debug(`Video rendered successfully and cached for ${videoPath}`)
    return result
  } catch (error) {
    logger.error({ jobId: job.id, userId, year, error }, 'Year in Review job failed')
    throw error
  }
}

export const yearInReviewWorker = new Worker('year-in-review', processYearInReviewJob, {
  connection,
  concurrency: 1,
  lockDuration: 10 * 60 * 1000,
  stalledInterval: 5 * 30 * 1000,
})

yearInReviewWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Year in Review job completed')
})

yearInReviewWorker.on('failed', (job, err) => {
  logger.error(
    {
      jobId: job?.id,
      error: err.message,
      stack: err.stack,
    },
    'Year in Review job failed'
  )
})
