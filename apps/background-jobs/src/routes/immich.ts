import express from 'express'
import { logger } from '@shared/services/logger'
import { immichImporterQueue } from '../queue'
import { ImmichImporterRequestSchema } from '../schemas/immich'

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

export default router
