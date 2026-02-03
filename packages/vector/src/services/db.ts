import type { VideoMetadataSummary } from '@shared/types/search'
import type { Metadata } from 'chromadb'
import type { VideoWithScenes } from '@shared/types/video'
import type { Scene } from '@shared/types/scene'
import { metadataToScene } from '../utils/shared'
import { getCache, setCache } from '@shared/services/cache'
import { logger } from '@shared/services/logger'
import type { YearStats } from '@shared/types/stats'
import { createVectorDbClient } from './client'
import { convertScenesToVideos } from '@vector/utils/videos'

export async function getByVideoSource(videoSource: string): Promise<VideoWithScenes | null> {
  try {
    const { collection } = await createVectorDbClient()
    if (!collection) throw new Error('Collection not initialized')

    const result = await collection.get({
      where: { source: { $eq: videoSource } },
      include: ['metadatas', 'documents'],
    })

    const scenes = result.metadatas.map((m, i) => metadataToScene(m, result.ids[i], result.documents[i]))

    const videos = convertScenesToVideos(scenes)
    return videos.length > 0 ? videos[0] : null
  } catch (error) {
    logger.error('Error getting video by source: ' + error)
    return null
  }
}

export async function updateMetadata(
  vector: {
    metadata: Metadata
    text: string
    id: string
  },
  embeddings: number[][]
): Promise<void> {
  try {
    const { collection, visual_collection, audio_collection } = await createVectorDbClient()

    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const existing = await collection.get({
      ids: [vector.id],
      include: ['metadatas', 'documents', 'embeddings'],
    })

    if (existing.ids && existing.ids.length === 0) {
      logger.warn('No scene found to update')
    }

    if (existing.ids && existing.ids.length > 0) {
      // Update the main collection with new embeddings and metadata
      await collection.update({
        ids: [vector.id],
        metadatas: [vector.metadata],
        documents: [vector.text],
        embeddings: embeddings,
      })
    }

    // Update visual and audio collection metadata only
    if (visual_collection) {
      const visualExists = await visual_collection.get({
        ids: [vector.id],
        include: ['metadatas', 'documents'],
      })

      if (visualExists.ids && visualExists.ids.length > 0) {
        await visual_collection.update({
          ids: [vector.id],
          metadatas: [vector.metadata],
        })
      }
    }

    if (audio_collection) {
      const audioExists = await audio_collection.get({
        ids: [vector.id],
        include: ['metadatas', 'documents'],
      })

      if (audioExists.ids && audioExists.ids.length > 0) {
        await audio_collection.update({
          ids: [vector.id],
          metadatas: [vector.metadata],
        })
      }
    }
  } catch (error) {
    logger.error('Error updating documents: ' + error)
    throw error
  }
}

export async function getVideoWithScenesBySceneIds(sceneIds: string[]): Promise<Scene[]> {
  try {
    const { collection } = await createVectorDbClient()

    if (!collection) {
      throw new Error('Collection not initialized')
    }

    if (sceneIds.length === 0) {
      return []
    }

    const result = await collection?.get({
      ids: sceneIds,
      include: ['metadatas', 'documents'],
    })

    const scenes = []

    if (result && result.metadatas) {
      for (let i = 0; i < result.metadatas.length; i++) {
        const metadata = result.metadatas[i]
        if (!metadata) continue

        const scene: Scene = metadataToScene(metadata, result.ids[i], result.documents[i])
        scenes.push(scene)
      }
    }

    return scenes
  } catch (error) {
    logger.error('Error getting videos with scenes by scene IDs: ' + error)
    throw error
  }
}

async function getUniqueVideoSources(): Promise<string[]> {
  const { collection } = await createVectorDbClient()

  if (!collection) throw new Error('Collection not initialized')

  const allDocs = await collection?.get({ include: ['metadatas', 'documents'] })

  const uniqueSources = new Set<string>()
  allDocs.metadatas
    ?.sort((a, b) => {
      if (a && a.createdAt && b && b.createdAt) {
        const timeA = isNaN(Date.parse(a.createdAt.toString())) ? 0 : new Date(a.createdAt.toString()).getTime()
        const timeB = isNaN(Date.parse(b.createdAt.toString())) ? 0 : new Date(b.createdAt.toString()).getTime()

        return timeB - timeA
      }
      return -1
    })
    .forEach((metadata) => {
      const source = metadata?.source?.toString()
      if (source) uniqueSources.add(source)
    })

  return Array.from(uniqueSources)
}
export async function updateScenesSource(oldSource: string, newSource: string): Promise<void> {
  const { collection, visual_collection, audio_collection } = await createVectorDbClient()

  if (!collection) throw new Error('Collection not initialized')

  const result = await collection?.get({
    where: { source: { $eq: oldSource } },
    include: ['metadatas', 'documents'],
  })

  if (!result.ids || result.ids.length === 0) {
    logger.warn(`No scenes found for source: ${oldSource}`)
    return
  }

  const ids = result.ids
  const metadatas = result.metadatas.map((metadata) => ({
    ...metadata,
    source: newSource,
  }))

  await collection.update({
    ids,
    metadatas,
  })
  if (visual_collection) {
    const result = await visual_collection?.get({
      where: { source: { $eq: oldSource } },
      include: ['metadatas', 'documents'],
    })

    if (!result.ids || result.ids.length === 0) {
      logger.warn(`No scenes found for source: ${oldSource}`)
      return
    }

    const ids = result.ids
    const metadatas = result.metadatas.map((metadata) => ({
      ...metadata,
      source: newSource,
    }))

    await visual_collection.update({
      ids,
      metadatas,
    })
  }

  if (audio_collection) {
    const result = await audio_collection?.get({
      where: { source: { $eq: oldSource } },
      include: ['metadatas', 'documents'],
    })

    if (!result.ids || result.ids.length === 0) {
      logger.warn(`No scenes found for source: ${oldSource}`)
      return
    }

    const ids = result.ids
    const metadatas = result.metadatas.map((metadata) => ({
      ...metadata,
      source: newSource,
    }))

    await audio_collection.update({
      ids,
      metadatas,
    })
  }
}
export async function deleteByVideoSource(source: string): Promise<void> {
  const { collection, visual_collection, audio_collection } = await createVectorDbClient()

  if (!collection) throw new Error('Collection not initialized')

  await collection.delete({ where: { source: source } })

  if (visual_collection) await visual_collection.delete({ where: { source: source } })
  if (audio_collection) await audio_collection.delete({ where: { source: source } })
}

export async function getScenesByYear(year: number): Promise<{
  videos: VideoWithScenes[]
  stats: YearStats
}> {
  try {
    const { collection } = await createVectorDbClient()

    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const start = new Date(`${year}-01-01T00:00:00.000Z`).getTime()
    const end = new Date(`${year}-12-31T23:59:59.999Z`).getTime()

    const allDocs = await collection.get({
      include: ['metadatas', 'documents'],
      where: {
        $and: [{ createdAt: { $gte: start } }, { createdAt: { $lte: end } }],
      },
    })

    const globalStats = {
      totalEmotions: new Map<string, number>(),
      totalWords: new Map<string, number>(),
      totalObjects: new Map<string, number>(),
      totalFaces: new Map<string, number>(),
      totalShotTypes: new Map<string, number>(),
      totalCategories: new Map<string, number>(),
      longestScene: { duration: 0, description: '', videoSource: '' },
      shortestScene: { duration: Infinity, description: '', videoSource: '' },
      totalDuration: 0,
    }
    const scenes = []

    for (let i = 0; i < allDocs.metadatas.length; i++) {
      const metadata = allDocs.metadatas[i]
      if (!metadata) continue

      const source = metadata.source?.toString()
      if (!source) {
        continue
      }

      const scene: Scene = metadataToScene(metadata, allDocs.ids[i], allDocs.documents[i])
      scenes.push(scene)
    }
    if (allDocs && allDocs.metadatas && allDocs.ids) {
      for (let i = 0; i < allDocs.metadatas.length; i++) {
        const metadata = allDocs.metadatas[i]
        if (!metadata) continue

        const createdAt = metadata.createdAt
        if (!createdAt) continue

        const scene: Scene = metadataToScene(metadata, allDocs.ids[i], allDocs.documents[i])
        const sceneDuration = scene.endTime - scene.startTime

        if (sceneDuration > globalStats.longestScene.duration) {
          globalStats.longestScene = {
            duration: sceneDuration,
            description: scene.description || '',
            videoSource: metadata.source?.toString() || '',
          }
        }

        if (sceneDuration < globalStats.shortestScene.duration && sceneDuration > 0) {
          globalStats.shortestScene = {
            duration: sceneDuration,
            description: scene.description || '',
            videoSource: metadata.source?.toString() || '',
          }
        }

        globalStats.totalDuration += sceneDuration

        scene.emotions?.forEach((e) => {
          const emotion = e.emotion
          if (emotion.toLocaleLowerCase().includes('n/a')) return
          globalStats.totalEmotions.set(emotion, (globalStats.totalEmotions.get(emotion) || 0) + 1)
        })

        scene.transcriptionWords?.forEach((e) => {
          const word = e.word
          if (word.toLocaleLowerCase().includes('n/a')) return
          globalStats.totalWords.set(word, (globalStats.totalWords.get(word) || 0) + 1)
        })
        scene.objects?.forEach((obj) => {
          if (obj.toLocaleLowerCase().includes('person')) return
          globalStats.totalObjects.set(obj, (globalStats.totalObjects.get(obj) || 0) + 1)
        })

        scene.faces?.forEach((face) => {
          if (face.toLocaleLowerCase().includes('unknown')) return
          globalStats.totalFaces.set(face, (globalStats.totalFaces.get(face) || 0) + 1)
        })

        if (scene.shotType) {
          globalStats.totalShotTypes.set(scene.shotType, (globalStats.totalShotTypes.get(scene.shotType) || 0) + 1)
        }

        if (metadata.category) {
          const category = metadata.category.toString()
          globalStats.totalCategories.set(category, (globalStats.totalCategories.get(category) || 0) + 1)
        }

        const source = metadata.source?.toString()
        if (source) {
          scenes.push(scene)
        }
      }
    }

    const videosList = convertScenesToVideos(scenes)

    const stats: YearStats = {
      totalVideos: videosList.length,
      totalScenes: allDocs.ids?.length || 0,
      totalDuration: globalStats.totalDuration,
      topEmotions: Array.from(globalStats.totalEmotions.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([emotion, count]) => ({ emotion, count })),
      topWords: Array.from(globalStats.totalWords.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => ({ word, count })),
      topObjects: Array.from(globalStats.totalObjects.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([name, count]) => ({ name, count })),
      topFaces: Array.from(globalStats.totalFaces.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count })),
      topShotTypes: Array.from(globalStats.totalShotTypes.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count })),
      categories: Array.from(globalStats.totalCategories.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count })),
      longestScene: globalStats.longestScene,
      shortestScene: globalStats.shortestScene.duration !== Infinity ? globalStats.shortestScene : null,
    }

    const result = {
      videos: videosList,
      stats,
    }

    return result
  } catch (error) {
    logger.error('Error getting scenes by year: ' + error)
    throw error
  }
}

export async function getAllSceneEmbeddings(
  batchSize: number = 100,
  offset?: number
): Promise<
  {
    id: string
    metadata: Metadata
    visualEmbedding: number[]
    audioEmbedding: number[] | null
    textEmbedding: number[]
  }[]
> {
  const { visual_collection, audio_collection, collection } = await createVectorDbClient()
  if (!visual_collection || !audio_collection || !collection) {
    throw new Error('Collections not initialized')
  }

  const results = []

  try {
    const textScenes = await collection.get({
      include: ['metadatas', 'embeddings'],
      limit: batchSize,
      offset: offset,
    })

    if (textScenes.ids.length === 0) {
      return []
    }
    const visualScenes = await visual_collection.get({
      include: ['embeddings'],
      ids: textScenes.ids,
    })

    const audioScenes = await audio_collection.get({
      include: ['embeddings'],
      ids: textScenes.ids,
    })

    const audioEmbeddingsMap = new Map<string, number[]>()
    if (audioScenes.embeddings) {
      for (let i = 0; i < audioScenes.ids.length; i++) {
        const embedding = audioScenes.embeddings[i]
        if (embedding) {
          audioEmbeddingsMap.set(audioScenes.ids[i], embedding as number[])
        }
      }
    }
    const visualEmbeddingsMap = new Map<string, number[]>()
    if (visualScenes.embeddings) {
      for (let i = 0; i < visualScenes.ids.length; i++) {
        const embedding = visualScenes.embeddings[i] as number[]

        if (embedding) {
          visualEmbeddingsMap.set(visualScenes.ids[i], embedding as number[])
        }
      }
    }

    if (textScenes.embeddings) {
      for (let i = 0; i < textScenes.ids.length; i++) {
        const id = textScenes.ids[i]
        const metadata = textScenes.metadatas[i]
        const textEmbedding = textScenes.embeddings[i] as number[]

        const audioEmbedding = audioEmbeddingsMap.get(id) || null
        const visualEmbedding = visualEmbeddingsMap.get(id) || null

        if (!metadata) {
          logger.warn(`No metadata for id ${id}`)
          continue
        }

        if (textEmbedding && visualEmbedding) {
          results.push({
            id,
            metadata,
            visualEmbedding,
            audioEmbedding,
            textEmbedding,
          })
        }
      }
    }

    return results
  } catch (error) {
    logger.error(`Error fetching embeddings batch at offset ${offset}: ${error}`)
    throw error
  }
}

export async function getVideosMetadataSummary(): Promise<VideoMetadataSummary> {
  try {
    const cacheKey = `videos:metadata`

    const cached = await getCache<VideoMetadataSummary>(cacheKey)
    if (cached) {
      return cached
    }
    const { collection } = await createVectorDbClient()

    if (!collection) throw new Error('Collection not initialized')

    const allDocs = await collection?.get({
      include: ['metadatas', 'documents'],
    })

    const facesCount: Record<string, number> = {}
    const colorsCount: Record<string, number> = {}
    const emotionsCount: Record<string, number> = {}
    const shotTypesCount: Record<string, number> = {}
    const objectsCount: Record<string, number> = {}
    const cameraCount: Record<string, number> = {}
    const locationsCount: Record<string, number> = {}

    allDocs.metadatas?.forEach((metadata, index) => {
      if (!metadata) return
      const scene = metadataToScene(metadata, allDocs.ids[index], allDocs.documents[index])

      // Faces
      scene.faces?.forEach((name: string) => {
        if (!name.includes('Unknown')) {
          facesCount[name] = (facesCount[name] || 0) + 1
        }
      })

      // Colors
      if (scene.dominantColorName) {
        const name = scene.dominantColorName
        if (!name.includes('Unknown')) {
          colorsCount[name] = (colorsCount[name] || 0) + 1
        }
      }

      // Emotions
      scene.emotions?.forEach((e) => {
        const name = e.emotion
        emotionsCount[name] = (emotionsCount[name] || 0) + 1
      })

      // Shot types
      if (scene.shotType) {
        const name = scene.shotType
        shotTypesCount[name] = (shotTypesCount[name] || 0) + 1
      }
      if (scene.camera) {
        const name = scene.camera
        if (!name.toLocaleLowerCase().includes('unknown')) {
          cameraCount[name] = (cameraCount[name] || 0) + 1
        }
      }

      // Objects
      scene.objects?.forEach((o: string) => {
        const name = o
        if (!name.includes('person')) {
          objectsCount[name] = (objectsCount[name] || 0) + 1
        }
      })

      // Locations
      if (scene.location) {
        const name = scene.location
        if (!name.toLocaleLowerCase().includes('unknown')) {
          locationsCount[name] = (locationsCount[name] || 0) + 1
        }
      }
    })

    const getTop = (obj: Record<string, number>) =>
      Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }))

    const totalVideos = await getUniqueVideoSources()
    const result = {
      topFaces: getTop(facesCount),
      topColors: getTop(colorsCount),
      topEmotions: getTop(emotionsCount),
      shotTypes: getTop(shotTypesCount),
      topObjects: getTop(objectsCount),
      cameras: getTop(cameraCount),
      totalVideos: totalVideos.length,
      topLocations: getTop(locationsCount),
    }

    await setCache(cacheKey, result, 100)
    return result
  } catch (error) {
    logger.error('Error aggregating metadata from DB: ' + error)
    throw error
  }
}

export async function getSceneBySourceAndStartTime(source: string, startTime: number): Promise<Scene | null> {
  try {
    const { collection } = await createVectorDbClient()
    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const result = await collection.get({
      where: {
        $and: [{ source: { $eq: source } }, { startTime: { $eq: startTime } }],
      },
      include: ['metadatas', 'documents'],
      limit: 1,
    })

    if (!result.metadatas || result.metadatas.length === 0) {
      return null
    }

    return metadataToScene(result.metadatas[0], result.ids[0], result.documents[0])
  } catch (error) {
    logger.error('Error getting scene by source and startTime: ' + error)
    return null
  }
}

export async function getScenesCount(): Promise<number> {
  try {
    const { collection } = await createVectorDbClient()
    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const count = await collection.count()

    return count
  } catch (error) {
    logger.error('Error getting scenes count: ' + error)
    return 0
  }
}

export async function* getScenesStream(batchSize: number = 100): AsyncGenerator<Scene> {
  try {
    const { collection } = await createVectorDbClient()

    if (!collection) {
      throw new Error('Collection not initialized')
    }

    let offset = 0
    let hasMore = true

    while (hasMore) {
      const batch = await collection.get({
        include: ['metadatas', 'documents'],
        limit: batchSize,
        offset: offset,
      })

      if (!batch.metadatas || batch.metadatas.length === 0) {
        hasMore = false
        break
      }

      for (let i = 0; i < batch.metadatas.length; i++) {
        const metadata = batch.metadatas[i]
        if (!metadata) continue

        const source = metadata.source?.toString()
        if (!source) continue

        const scene: Scene = metadataToScene(metadata, batch.ids[i], batch.documents[i])
        yield scene
      }

      if (batch.metadatas.length < batchSize) {
        hasMore = false
      } else {
        offset += batchSize
      }
    }
  } catch (error) {
    logger.error('Error streaming scenes: ' + error)
    throw error
  }
}
