import { VideoProcessingData } from '@shared/types/video'
import { logger } from '@shared/services/logger'
import { videoProcessingQueues } from '@background-jobs/queue'

const JOB_STATUSES = ['waiting', 'delayed', 'active', 'failed'] as const

export async function deleteJobsByDataJobId(targetJobId: string) {
  let deletedCount = 0

  for (const queue of videoProcessingQueues) {
    for (const status of JOB_STATUSES) {
      const jobs = await queue.getJobs([status], 0, -1)

      for (const job of jobs) {
        if (job.data?.jobId === targetJobId) {
          await job.remove()
          deletedCount++

          logger.info(`🗑️ Removed job ${job.id} from queue "${queue.name}"`)
        }
      }
    }
  }

  return deletedCount
}

export async function removeFailedJobs(failedJobsIds: string[]) {
  for (const queue of videoProcessingQueues) {
    const jobs = await queue.getJobs()

    for await (const job of jobs) {
      const data = job.data as VideoProcessingData
      if (failedJobsIds.includes(data.jobId)) {
        await job.remove()
      }
    }
  }
}
