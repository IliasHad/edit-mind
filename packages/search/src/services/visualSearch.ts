import { getImageEmbedding } from '@vector/services/embedding'
import { createVectorDbClient, getByVideoSource } from '@vector/services/vectorDb'
import { VideoWithScenesAndMatch } from '@shared/types/video'
import { logger } from '@shared/services/logger'
import { metadataToScene } from '@vector/utils/shared'

async function searchScenesByImage(
  visualEmbedding: number[],
  nResults: number = 10,
  confidenceThreshold: number = 0.7
): Promise<VideoWithScenesAndMatch[]> {
  try {
    const { visual_collection } = await createVectorDbClient()

    if (!visual_collection) {
      throw new Error('Visual collection not initialized')
    }

    if (!visualEmbedding || visualEmbedding.length === 0) {
      throw new Error('Invalid visual embedding')
    }

    const result = await visual_collection.query({
      queryEmbeddings: [visualEmbedding],
      nResults: nResults,
      include: ['metadatas', 'distances', 'documents'],
    })

    const metadatas = result.metadatas?.[0] || []
    const ids = result.ids?.[0] || []
    const distances = result.distances?.[0] || []

    const videosDict: Record<string, VideoWithScenesAndMatch> = {}

    for (let i = 0; i < metadatas.length; i++) {
      const metadata = metadatas[i]
      if (!metadata) {
        logger.warn(`⚠️  Null metadata at index ${i}`)
        continue
      }

      const source = metadata.source?.toString()
      if (!source) {
        continue
      }
      const distance = distances[i] || 1
      const similarity = 1 - distance

      if (similarity < confidenceThreshold) {
        continue
      }

      if (!videosDict[source]) {
        videosDict[source] = {
          source,
          duration: parseFloat(metadata.duration?.toString() || '0.00'),
          aspectRatio: metadata.aspectRatio?.toString() || 'Unknown',
          camera: metadata.camera?.toString() || 'Unknown',
          category: metadata.category?.toString() || 'Uncategorized',
          createdAt: parseInt(metadata.createdAt?.toString() || '0'),
          scenes: [],
          sceneCount: 0,
          thumbnailUrl: metadata.thumbnailUrl?.toString(),
          faces: [],
          emotions: [],
          objects: [],
          shotTypes: [],
        }
      }

      const scene = metadataToScene(metadata, ids[i])
      videosDict[source].scenes.push({ ...scene, matched: true })

      if (scene.faces)
        scene.faces.forEach((f) => {
          if (!videosDict[source].faces?.includes(f)) videosDict[source].faces.push(f)
        })
      if (scene.emotions)
        scene.emotions.forEach((e) => {
          if (!videosDict[source].emotions?.includes(e.emotion)) videosDict[source].emotions.push(e.emotion)
        })
      if (scene.objects)
        scene.objects.forEach((o) => {
          if (!videosDict[source].objects?.includes(o)) videosDict[source].objects.push(o)
        })
      if (scene.shotType && !videosDict[source].shotTypes?.includes(scene.shotType))
        videosDict[source].shotTypes.push(scene.shotType)
    }

    const videosList: VideoWithScenesAndMatch[] = []
    for (const video of Object.values(videosDict)) {
      const videoWithScenes = await getByVideoSource(decodeURIComponent(video.source))

      if (videoWithScenes) {
        for (const scene of videoWithScenes.scenes) {
          video.scenes.push({ ...scene, matched: false })
        }
        video.scenes.sort((a, b) => a.startTime - b.startTime)
        video.sceneCount = video.scenes.length
        videosList.push(video)
      }
    }

    videosList.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime()
      const timeB = new Date(b.createdAt).getTime()

      return timeB - timeA
    })

    return videosList
  } catch (error) {
    logger.error('Error in deep image search: ' + error)
    throw error
  }
}

export async function searchByImage(
  imageBuffer: Buffer,
  nResults?: number | undefined,
  confidenceThreshold = 0.7
): Promise<VideoWithScenesAndMatch[]> {
  try {
    const imageEmbedding = await getImageEmbedding(imageBuffer)

    if (!imageEmbedding || imageEmbedding.length === 0) {
      throw new Error('Could not generate embedding for the image.')
    }

    const scenes = await searchScenesByImage(imageEmbedding, nResults, confidenceThreshold)
    return scenes
  } catch (error) {
    logger.error('Error in searchByImage: ' + error)
    throw error
  }
}
