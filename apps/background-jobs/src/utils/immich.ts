import { immichImporterQueue } from '@background-jobs/queue'
import type { Job } from 'bullmq'

export async function getLatestImmichJob(
  integrationId: string
): Promise<Job | null> {
  const states = ['active', 'waiting', 'completed', 'failed'] as const

  for (const state of states) {
    const jobs = await immichImporterQueue.getJobs([state], 0, 50, true)

    const match = jobs.find(
      (job) => job.data?.integrationId === integrationId
    )

    if (match) return match
  }

  return null
}
