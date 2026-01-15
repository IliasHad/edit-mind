import { CollectionType } from '@prisma/client'
import { generateSmartCollections } from '@smart-collections/services/collection'
import { generateFacesBasedCollections } from '@smart-collections/generators/faces'
import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { logger } from '@shared/services/logger'
import { CollectionItemModel, CollectionModel, UserModel, VideoModel } from '@db/index'
import { generateLocationBasedCollections } from '@smart-collections/generators/locations'
import { COLLECTION_DEFINITIONS } from '@smart-collections/constants/collections'

async function processSmartCollectionJob(job: Job) {
  logger.info({ jobId: job.id }, 'Starting smart collection generation job')

  try {
    // TODO: Improve the logic of smart collection
    const user = await UserModel.findFirst()

    if (!user) throw new Error('User not found')

    // Fetch all videos once and create the mapping
    const allVideos = await VideoModel.findMany({
      select: { id: true, source: true, thumbnailUrl: true, duration: true },
    })

    if (allVideos.length === 0) {
      return { skip: true }
    }

    // Build a map of ids and video source to link the collection item with the video source

    const videoSourceToIdMap = new Map(allVideos.map((v) => [v.source, v.id]))

    // Build a map of thumbnail and video source to link the collection item with the video source
    const videoSourceToThumbnailMap = new Map(allVideos.map((v) => [v.source, v.thumbnailUrl]))

    // Build a map of video duration and video source to link the collection item with the video source
    const videoSourceToDurationMap = new Map(allVideos.map((v) => [v.source, v.duration]))

    // Generate location-based collections
    const locationCollections = await generateLocationBasedCollections()
    for (const [locationName, videoMap] of locationCollections) {
      const description = `Moments Captured at ${locationName}`
      const [videoSource] = videoMap.keys()
      const thumbnailUrl = videoSourceToThumbnailMap.get(videoSource) ?? null
      let totalDuration = 0

      for (const videoSource of videoMap.keys()) {
        const duration = videoSourceToDurationMap.get(videoSource) ?? 0
        totalDuration += parseFloat(duration.toString())
      }

      if (description && videoMap.size > 0) {
        const collection = await CollectionModel.upsert({
          where: {
            userId_type_name: {
              name: locationName,
              type: 'geographic_location',
              userId: user.id,
            },
          },
          update: {
            lastUpdated: new Date(),
            thumbnailUrl,
            itemCount: videoMap.size,
            totalDuration: BigInt(totalDuration),
          },
          create: {
            name: locationName,
            description: description,
            type: 'geographic_location',
            userId: user.id,
            isAutoPopulated: true,
            autoUpdateEnabled: true,
            thumbnailUrl,
            itemCount: videoMap.size,
            totalDuration: BigInt(totalDuration),
          },
        })

        const currentVideoIds = []
        for (const [videoSource, videoData] of videoMap.entries()) {
          const videoId = videoSourceToIdMap.get(videoSource)
          if (!videoId) continue

          currentVideoIds.push(videoId)

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

        // Delete no longer match video items
        await CollectionItemModel.deleteMany({
          where: {
            collectionId: collection.id,
            videoId: { notIn: currentVideoIds },
          },
        })
      }
    }

    // Generate face-based collections
    const facesCollections = await generateFacesBasedCollections()
    for (const [personName, videoMap] of facesCollections) {
      const description = `Moments Captured with ${personName}`
      const [videoSource] = videoMap.keys()
      const thumbnailUrl = videoSourceToThumbnailMap.get(videoSource) ?? null
      let totalDuration = 0

      for (const videoSource of videoMap.keys()) {
        const duration = videoSourceToDurationMap.get(videoSource) ?? 0
        totalDuration += parseFloat(duration.toString())
      }

      if (description && videoMap.size > 0) {
        const collection = await CollectionModel.upsert({
          where: {
            userId_type_name: {
              name: personName,
              type: 'person',
              userId: user.id,
            },
          },
          update: {
            lastUpdated: new Date(),
            thumbnailUrl,
            itemCount: videoMap.size,
            totalDuration: BigInt(totalDuration),
          },
          create: {
            name: personName,
            description: description,
            type: 'person',
            userId: user.id,
            isAutoPopulated: true,
            autoUpdateEnabled: true,
            thumbnailUrl,
            itemCount: videoMap.size,
            totalDuration: BigInt(totalDuration),
          },
        })

        const currentVideoIds = []
        for (const [videoSource, videoData] of videoMap.entries()) {
          const videoId = videoSourceToIdMap.get(videoSource)
          if (!videoId) continue
          currentVideoIds.push(videoId)

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
        // Delete no longer match video items
        await CollectionItemModel.deleteMany({
          where: {
            collectionId: collection.id,
            videoId: { notIn: currentVideoIds },
          },
        })
      }
    }
    // Generate smart collections based on embedding and Collection Definitions
    const smartCollections = await generateSmartCollections()
    for (const [collectionName, videoMap] of smartCollections) {
      const description = COLLECTION_DEFINITIONS[collectionName].description
      const type = COLLECTION_DEFINITIONS[collectionName].category
      const [videoSource] = videoMap.keys()
      const thumbnailUrl = videoSourceToThumbnailMap.get(videoSource) ?? null
      let totalDuration = 0

      for (const videoSource of videoMap.keys()) {
        const duration = videoSourceToDurationMap.get(videoSource) ?? 0
        totalDuration += parseFloat(duration.toString())
      }

      if (type && description && videoMap.size > 0) {
        const collection = await CollectionModel.upsert({
          where: {
            userId_type_name: {
              name: collectionName,
              type: type as CollectionType,
              userId: user.id,
            },
          },
          update: {
            lastUpdated: new Date(),
            thumbnailUrl,
            itemCount: videoMap.size,
            totalDuration: BigInt(totalDuration),
          },
          create: {
            name: collectionName,
            description: description,
            type: type as CollectionType,
            userId: user.id,
            isAutoPopulated: true,
            autoUpdateEnabled: true,
            thumbnailUrl,
            itemCount: videoMap.size,
            totalDuration: BigInt(totalDuration),
          },
        })

        const currentVideoIds = []

        for (const [videoSource, videoData] of videoMap.entries()) {
          const videoId = videoSourceToIdMap.get(videoSource)
          if (!videoId) continue
          currentVideoIds.push(videoId)

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
        // Delete no longer match video items
        await CollectionItemModel.deleteMany({
          where: {
            collectionId: collection.id,
            videoId: { notIn: currentVideoIds },
          },
        })
      }
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
