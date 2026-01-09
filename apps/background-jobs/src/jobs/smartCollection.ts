import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { logger } from '@shared/services/logger'
import { generateSmartCollections } from '@smart-collections/services/collection'
import { CollectionItemModel, CollectionModel, UserModel, VideoModel } from '@db/index'
import { COLLECTION_DEFINITIONS } from '@smart-collections/constants/collections'
import { CollectionType } from '@prisma/client'
import { audioEmbeddingQueue, frameAnalysisQueue, textEmbeddingQueue, visualEmbeddingQueue } from 'src/queue'

async function processSmartCollectionJob(job: Job) {
  logger.info({ jobId: job.id }, 'Starting smart collection generation job')

  try {
    const [visualEmbeddingJobs, textEmbeddingJobs, frameAnalysisJobs, audioEmbeddingJobs] = await Promise.all([
      visualEmbeddingQueue.getActive(),
      textEmbeddingQueue.getActive(),
      frameAnalysisQueue.getActive(),
      audioEmbeddingQueue.getActive(),
    ])

    if (
      visualEmbeddingJobs.length > 0 ||
      textEmbeddingJobs.length > 0 ||
      frameAnalysisJobs.length > 0 ||
      audioEmbeddingJobs.length > 0
    ) {
      // If we have a running job, we'll skip the smart collections generation
      return { skip: true }
    }

    const collectionVideos = await generateSmartCollections()

    const user = await UserModel.findFirst()

    if (!collectionVideos) throw new Error('Collection videos not found')

    if (!user) throw new Error('User not found')

    const allDbVideos = await VideoModel.findMany({ select: { id: true, source: true } })
    const videoSourceToIdMap = new Map<string, string>()
    allDbVideos.forEach((v) => videoSourceToIdMap.set(v.source, v.id))

    for (const [collectionName, videosMap] of collectionVideos.entries()) {
      const definition = COLLECTION_DEFINITIONS[collectionName]
      let fallbackDescription
      let fallbackCategory
      const firstEntry = videosMap.entries().next().value

      if (!definition && firstEntry && firstEntry[1].match_type === 'geographic_location') {
        fallbackDescription = `Moments Captured at ${collectionName}`
        fallbackCategory = 'geographic_location'
      }
      if (!definition && firstEntry && firstEntry[1].match_type === 'person') {
        fallbackDescription = `Moments Captured with ${collectionName}`
        fallbackCategory = 'person'
      }

      let collection = await CollectionModel.findByNameAndUser(collectionName, user.id)

      if (collection && !collection.autoUpdateEnabled) {
        return
      }
      if (collection) {
        collection = await CollectionModel.update(collection.id, {
          lastUpdated: new Date(),
        })
      } else {
        collection = await CollectionModel.create({
          name: collectionName,
          description: (definition?.description.toString() || fallbackDescription) ?? null,
          type: (definition?.category.toString() as CollectionType) || fallbackCategory,
          userId: user.id,
          isAutoPopulated: true,
          autoUpdateEnabled: true,
        })
      }

      for (const [videoSource, videoData] of videosMap.entries()) {
        const videoId = videoSourceToIdMap.get(videoSource)
        if (!videoId) continue

        const avgConfidence = videoData.scenes.reduce((acc, s) => acc + s.confidence, 0) / videoData.scenes.length
        const sceneIds = videoData.scenes.map((s) => s.sceneId)

        await CollectionItemModel.upsert({
          where: { collectionId_videoId: { collectionId: collection.id, videoId: videoId } },
          create: {
            collectionId: collection.id,
            videoId: videoId,
            sceneIds: sceneIds,
            confidence: avgConfidence,
            matchType: videoData.match_type,
          },
          update: {
            sceneIds: sceneIds,
            confidence: avgConfidence,
            matchType: videoData.match_type,
          },
        })
      }

      const itemCount = await CollectionItemModel.count(collection.id)

      const items = await CollectionItemModel.findManyAndVideos(collection.id)
      const thumbnailUrl = items[0]?.video?.thumbnailUrl
      const totalDuration = items.reduce(
        (acc, item) => acc + (item.video.duration ? BigInt(item.video.duration) : BigInt(0)),
        BigInt(0)
      )

      await CollectionModel.update(collection.id, {
        itemCount: itemCount,
        totalDuration: totalDuration,
        thumbnailUrl,
      })
    }
    logger.info({ jobId: job.id }, 'Smart collection generation job completed successfully')
  } catch (error) {
    logger.error({ jobId: job.id, error }, 'Smart collection generation job failed')
    throw error
  }
}

export const smartCollectionWorker = new Worker('smart-collection', processSmartCollectionJob, {
  connection,
  concurrency: 1,
  lockDuration: 10 * 60 * 1000,
})
