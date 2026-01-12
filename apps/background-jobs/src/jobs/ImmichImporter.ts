import { decryptApiKey } from '@immich/services/encryption';
import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { ImmichImporterJobData } from '@immich/types/immich'
import { IntegrationModel } from '@db/index'
import { ImmichConfigFormSchema } from '@immich/schemas/immich'
import { getAllImmichFaces } from '@immich/services/immich';
import { logger } from '@shared/services/logger'

async function processImmichImporterJob(job: Job<ImmichImporterJobData>) {
  try {
    const integration = await IntegrationModel.findById(job.data.integrationId)
    if (!integration || !integration.config) throw new Error('Integration not found')

    const config = JSON.parse(JSON.stringify(integration.config))
    const configResult = ImmichConfigFormSchema.safeParse({
      ...config,
      apiKey: decryptApiKey(config.apiKey),
    })
    if (!configResult.success) {
      throw new Error('Invalid Immich configuration: ' + configResult.error.message)
    }

    logger.debug(`Starting Immich face import for integration ${job.data.integrationId}`)

    const faces = await getAllImmichFaces(configResult.data)

    logger.debug(`Successfully imported ${faces.length} faces from Immich`)

    return {
      success: true,
      facesImported: faces.length,
    }
  } catch (error) {
    logger.error('Failed to process Immich importer job: ' + error)
    throw error
  }
}

export const ImmichImporter = new Worker('immich-importer', processImmichImporterJob, {
  connection,
  concurrency: 1,
})
