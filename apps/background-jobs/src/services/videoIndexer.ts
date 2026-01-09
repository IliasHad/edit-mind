import { Job } from 'bullmq'
import { JobStatus, JobStage } from '@prisma/client'
import { logger } from '@shared/services/logger'
import { VideoIndexJobData, VideoProcessingData } from '@shared/types/video'
import path from 'path'
import { PROCESSED_VIDEOS_DIR } from '@shared/constants'
import { transcriptionQueue } from 'src/queue'
import { JobModel } from '@db/index'
import { getVideoMetadata } from '@media-utils/utils/videos'

export async function updateJob(
  job: Job<VideoIndexJobData>,
  data: Partial<{
    stage: JobStage
    progress: number
    overallProgress: number
    status: JobStatus
    thumbnailPath?: string
    fileSize?: bigint
    frameAnalysisTime?: number
    sceneCreationTime?: number
    transcriptionTime?: number
    textEmbeddingTime?: number
    audioEmbeddingTime?: number
    visualEmbeddingTime?: number
    frameAnalysisPlugins?: Record<string, string | number>[]
  }>
) {
  if (!job.data?.jobId) return

  try {
    const updateData: Record<string, string | number | bigint | Record<string, string | number>[] | Date> = {
      updatedAt: new Date(),
    }

    if (!data.status) updateData.status = 'processing'

    if (data.stage) updateData.stage = data.stage
    if (data.progress) updateData.progress = data.progress
    if (data.overallProgress) updateData.overallProgress = data.overallProgress
    if (data.status) updateData.status = data.status
    if (data.thumbnailPath) updateData.thumbnailPath = data.thumbnailPath
    if (data.fileSize) updateData.fileSize = data.fileSize
    if (data.frameAnalysisTime) updateData.frameAnalysisTime = data.frameAnalysisTime
    if (data.sceneCreationTime) updateData.sceneCreationTime = data.sceneCreationTime
    if (data.transcriptionTime) updateData.transcriptionTime = data.transcriptionTime
    if (data.textEmbeddingTime) updateData.textEmbeddingTime = data.textEmbeddingTime
    if (data.audioEmbeddingTime) updateData.audioEmbeddingTime = data.audioEmbeddingTime
    if (data.visualEmbeddingTime) updateData.visualEmbeddingTime = data.visualEmbeddingTime
    if (data.frameAnalysisPlugins) {
      updateData.frameAnalysisPlugins = data.frameAnalysisPlugins
    }

    if (Object.keys(updateData).length === 1) return

    logger.debug(updateData, 'Job progress update')

    await JobModel.update(job.data.jobId, {
      ...updateData,
    })
  } catch (error) {
    logger.error({ jobId: job.data.jobId, error }, 'Failed to update job')
  }
}

export async function addVideoIndexingJob(jobData: VideoIndexJobData, priority: number = 0) {
  const videoDir = path.join(PROCESSED_VIDEOS_DIR, path.basename(jobData.videoPath))

  const analysisPath = path.join(encodeURI(videoDir), 'analysis.json')
  const transcriptionPath = path.join(encodeURI(videoDir), 'transcription.json')
  const scenesPath = path.join(encodeURI(videoDir), 'scenes.json')

  const metadata = await getVideoMetadata(jobData.videoPath)

  const videoData: VideoProcessingData = {
    ...jobData,
    analysisPath,
    transcriptionPath,
    scenesPath,
    forceReIndexing: jobData.forceReIndexing ?? false,
  }

  // Assign priority: shorter videos = higher priority
  let jobPriority: number
  if (priority !== 0) {
    jobPriority = priority // manual override
  } else {
    // Short videos (<10 min) = 1, Long videos (~1h) = 10
    jobPriority = metadata.duration < 600 ? 1 : 10
  }

  await transcriptionQueue.add('transcription', videoData, {
    removeOnComplete: false,
    removeOnFail: false,
    priority: jobPriority,
  })
}
