import express from 'express'
import { logger } from '@shared/services/logger'
import { JobModel } from 'db'
import { addVideoIndexingJob } from '@background-jobs/services/videoIndexer'
import { pythonService } from '@shared/services/pythonService'
import { removeFailedJobs } from '@background-jobs/utils/jobs'

const router = express.Router()

router.post('/:id/retry', async (req, res) => {
    try {
        const { id } = req.params

        const job = await JobModel.update(id, {
            status: 'pending'
        })

        await addVideoIndexingJob({
            jobId: job.id,
            videoPath: job.videoPath
        })

        return res.status(200).json({
            success: true, job: {
                ...job,
                fileSize: Number(job.fileSize)
            }
        })

    } catch (error) {
        logger.error(
            {
                error,
            },
            'Failed to retry job'
        )

        res.status(500).json({
            error: 'Failed to retry job',
            message: error instanceof Error ? error.message : 'Unknown error',
        })
    }
})

router.post('/:id/cancel', async (req, res) => {
    try {
        const { id } = req.params

        if (!pythonService.isServiceRunning()) {
            return res.status(500).json({
                success: false, message: "ML service is down"
            })
        }

        const job = await JobModel.findById(id)

        if (!job) {
            return res.status(404).json({
                success: false, message: "Job not found"
            })
        }

        if (job.stage === "frame_analysis") {
            pythonService.cancelAnalysis(job.id)
        }

        if (job.stage === "transcribing") {
            pythonService.cancelTranscription(job.id)
        }

        await JobModel.update(id, {
            status: "cancelled"
        })

        await removeFailedJobs([job.id])

        return res.status(200).json({
            success: true, job: {
                ...job,
                fileSize: Number(job.fileSize)
            }
        })

    } catch (error) {
        logger.error(
            {
                error,
            },
            'Failed to retry job'
        )

        res.status(500).json({
            error: 'Failed to retry job',
            message: error instanceof Error ? error.message : 'Unknown error',
        })
    }
})

export default router
