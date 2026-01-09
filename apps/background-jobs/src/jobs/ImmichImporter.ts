import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { ImmichImporterJobData } from '@immich/types/immich'
import { IntegrationModel } from '@db/index'

async function processImmichImporterJob(job: Job<ImmichImporterJobData>) {
  try {
    const integration = await IntegrationModel.findById(job.data.integrationId)
    if (!integration) throw new Error('Integration not found')

    // TODO: add logic to import immich faces images and their label name

  } catch (error) {
    console.error(error)
  }
}

export const ImmichImporter = new Worker('immich-importer', processImmichImporterJob, {
  connection,
  concurrency: 1,
})
