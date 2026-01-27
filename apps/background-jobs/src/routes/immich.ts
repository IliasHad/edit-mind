import express from 'express'
import { logger } from '@shared/services/logger'
import { immichImporterQueue } from '@background-jobs/queue'
import { ImmichImporterRequestSchema } from '../schemas/immich'
import { ImmichImportJobProgress, ImmichImportStatus } from '@immich/types/immich'
import { getLatestImmichJob } from '@background-jobs/utils/immich'

const router = express.Router()

router.post('/import', async (req, res) => {
  try {
    const parseResult = ImmichImporterRequestSchema.safeParse(req.body)

    if (!parseResult.success) {
      logger.warn(
        {
          error: parseResult.error.format(),
          body: req.body,
        },
        'Invalid request body for Immich import'
      )

      return res.status(400).json({
        error: 'Invalid request body',
        details: parseResult.error.flatten(),
      })
    }

    const { integrationId } = parseResult.data

    const job = await immichImporterQueue.add('immich-importer', {
      integrationId,
    })

    res.json({
      message: 'Immich import job queued successfully',
      jobId: job.id,
    })
  } catch (error) {
    logger.error(
      {
        error,
      },
      'Failed to queue Immich import job'
    )

    res.status(500).json({
      error: 'Failed to queue Immich import job',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params

    const job = await getLatestImmichJob(id)

    if (!job) {
      return res.json({
        isImporting: false,
        status: 'idle',
        progress: 0,
        totalFaces: 0,
        processedFaces: 0,
        error: null,
      })
    }

    const state = await job.getState()
    const progress = job.progress as ImmichImportJobProgress

    const response: ImmichImportStatus = {
      isImporting: state === 'active' || state === 'waiting',
      status: state === 'completed' ? 'completed' : state === 'failed' ? 'failed' : 'importing',
      progress: progress?.progress ?? 0,
      processedFaces: progress?.processedFaces ?? 0,
      error: state === 'failed' ? (job.failedReason ?? null) : null,
    }

    if (state === 'completed') {
      response.progress = 100
      response.processedFaces = job.returnvalue?.processedFaces ?? response.processedFaces
    }
    return res.status(200).json(response)
  } catch (error) {
    logger.error(
      {
        error,
      },
      'Failed to get Immich import job status'
    )

    res.status(500).json({
      error: 'Failed to get Immich import job status',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export default router
