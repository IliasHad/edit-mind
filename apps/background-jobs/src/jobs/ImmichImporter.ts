import { decryptApiKey } from '@immich/services/encryption'
import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { ImmichImporterJobData } from '@immich/types/immich'
import { IntegrationModel } from '@db/index'
import { ImmichConfigFormSchema } from '@immich/schemas/immich'
import { createPersonDirectory, ImmichClient, processAssetForPerson } from '@immich/services/immich'
import { logger } from '@shared/services/logger'
import { rebuildFacesCache } from '@shared/utils/faces'

async function processImmichImporterJob(job: Job<ImmichImporterJobData>) {
  try {
    const integration = await IntegrationModel.findById(job.data.integrationId)
    if (!integration || !integration.config) {
      throw new Error('Integration not found')
    }
    const configResult = ImmichConfigFormSchema.safeParse(integration.config)

    if (!configResult.success) {
      throw new Error('Invalid Immich configuration')
    }

    const config = {
      apiKey: decryptApiKey(configResult.data.apiKey),
      baseUrl: configResult.data.baseUrl,
    }

    const client = new ImmichClient(config)

    const [people, buckets] = await Promise.all([client.getAllPeople(), client.getTimeBuckets()])

    let totalAssets = 0
  

    let processedAssets = 0
    let processedFaces = 0

    await job.updateProgress({
      totalAssets,
      processedAssets,
      processedFaces,
      progress: 0,
    })

    for (const person of people) {
      if (!person.name) {
        continue
      }
      const personDir = await createPersonDirectory(person)

      for (const bucket of buckets) {
        const assetIds = await client.getAssetsByPersonAndBucket(person.id, bucket.timeBucket)
        totalAssets += assetIds.length

        for (const assetId of assetIds) {
          try {
            const faces = await processAssetForPerson(client, person.name, assetId, personDir)

            processedFaces += faces.length
          } catch (err) {
            logger.error(`Asset ${assetId} failed: ${err}`)
          }

          processedAssets++

          await job.updateProgress({
            totalAssets,
            processedAssets,
            processedFaces,
            progress: Math.round((processedAssets / totalAssets) * 100),
          })
        }
      }
    }

    await rebuildFacesCache()
    return {
      success: true,
      processedFaces,
      totalAssets,
    }
  } catch (error) {
    logger.error({ error }, 'Failed to process Immich importer job')
    throw error
  }
}

export const ImmichImporter = new Worker('immich-importer', processImmichImporterJob, {
  connection,
  concurrency: 1,
})
