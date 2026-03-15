import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { logger } from '@shared/services/logger'
import { VideoProcessingData } from '@shared/types/video'
import { updateJob } from '../services/videoIndexer';
import { JobStatus } from '@prisma/client'
import { transcodeVideo } from '@media-utils/utils/trancoding'
import { dirname } from 'path';
import { JobModel } from 'db';

async function processVideo(job: Job<VideoProcessingData>) {
    const { jobId, videoPath } = job.data

    logger.debug({ jobId }, 'Starting video transcoding')

    try {
        const videoJob = await JobModel.findById(jobId)

        if (videoJob?.status === "cancelled") {
            logger.info({ jobId }, 'Transcoding cancelled, stopping pipeline')
            return
        }

        const transcodingStartTime = Date.now()

        await updateJob(job, { status: 'processing', overallProgress: 0, stage: "transcoding", progress: 0 })

        const videoFolder = dirname(videoPath)

        const transcodedVideoFile = await transcodeVideo(videoPath, videoFolder)

        const transcodingTime = (Date.now() - transcodingStartTime) / 1000

        await updateJob(job, { status: 'done', progress: 100, stage: "transcoding", transcodingTime, overallProgress: 1000 })

        return transcodedVideoFile

    } catch (error) {
        logger.error({ jobId, error, stack: error instanceof Error ? error.stack : undefined }, 'Video transcoding failed')
        await updateJob(job, { status: JobStatus.error })
        throw error
    }
}

export const videoTranscodingWorker = new Worker('transcoding-video', processVideo, {
    connection,
    concurrency: 5,
    lockDuration: 5 * 60 * 1000,
    stalledInterval: 30 * 1000,
    maxStalledCount: 3,
})
