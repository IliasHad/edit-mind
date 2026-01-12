import { VideoMetadataSummary } from '@shared/types/search'
import { ChromaClient, Collection, Metadata } from 'chromadb'
import { EmbeddingInput, EmbeddingAudioInput, EmbeddingVisualInput } from '../types/vector'
import { VideoWithScenes } from '@shared/types/video'
import { Scene } from '@shared/types/scene'
import { metadataToScene, sanitizeMetadata, sceneToVectorFormat } from '../utils/shared'
import { CHROMA_HOST, CHROMA_PORT, COLLECTION_NAME, IS_TESTING } from '@vector/constants'
import { getEmbeddings } from './embedding'
import { getCache, setCache } from '@shared/services/cache'
import { logger } from '@shared/services/logger'
import { getLocationName } from '@shared/utils/location'
import { YearStats } from '@shared/types/stats'

let cachedClient: ChromaClient | null = null
let cachedCollection: Collection | null = null
let cachedVisualCollection: Collection | null = null
let cachedAudioCollection: Collection | null = null
let cachedCollectionName: string | null = null

export const createVectorDbClient = async (
  collectionName: string = COLLECTION_NAME
): Promise<{
  collection: Collection | null
  client: ChromaClient | null
  visual_collection: Collection | null
  audio_collection: Collection | null
}> => {
  // Return cached instances if they exist and collection name matches
  if (
    cachedClient &&
    cachedCollection &&
    cachedVisualCollection &&
    cachedAudioCollection &&
    cachedCollectionName === collectionName
  ) {
    return {
      client: cachedClient,
      collection: cachedCollection,
      audio_collection: cachedAudioCollection,
      visual_collection: cachedVisualCollection,
    }
  }

  try {
    cachedClient = new ChromaClient({ host: CHROMA_HOST, port: parseInt(CHROMA_PORT) })

    cachedCollection = await cachedClient.getOrCreateCollection({ name: collectionName })

    cachedVisualCollection = await cachedClient.getOrCreateCollection({
      name: `${collectionName}_visual`,
    })

    cachedAudioCollection = await cachedClient.getOrCreateCollection({
      name: `${collectionName}_audio`,
    })

    cachedCollectionName = collectionName

    return {
      client: cachedClient,
      collection: cachedCollection,
      audio_collection: cachedAudioCollection,
      visual_collection: cachedVisualCollection,
    }
  } catch (error) {
    logger.error(`Failed to initialize ChromaDB client: ${error}`)
    cachedClient = null
    cachedCollection = null
    cachedVisualCollection = null
    cachedAudioCollection = null
    cachedCollectionName = null
    throw error
  }
}

async function embedDocuments(documents: EmbeddingInput[]): Promise<void> {
  try {
    const validDocuments = documents.filter((d) => d.text && d.text.trim().length > 0 && d.id && d.metadata)

    if (validDocuments.length === 0) {
      logger.warn('No valid documents to embed after validation')
      return
    }

    const { collection } = await createVectorDbClient()
    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const sanitizedDocuments = validDocuments.map((doc) => ({
      ...doc,
      metadata: doc.metadata ? sanitizeMetadata(doc.metadata) : {},
    }))

    const ids = sanitizedDocuments.map((d) => d.id)
    const metadatas = sanitizedDocuments.map((d) => d.metadata || {})
    const documentTexts = sanitizedDocuments.map((d) => d.text)

    const embeddings = await getEmbeddings(documentTexts)

    if (!embeddings || embeddings.length !== documentTexts.length) {
      throw new Error('Embedding count mismatch')
    }

    const dimensions = new Set(embeddings.map((e) => e.length))
    if (dimensions.size > 1) {
      throw new Error(`Inconsistent embedding dimensions: ${Array.from(dimensions).join(', ')}`)
    }

    await collection.add({
      ids,
      metadatas,
      documents: documentTexts,
      embeddings,
    })
  } catch (error) {
    logger.error('Error embedding documents:' + error)
    throw error
  }
}

const getAllVideos = async (): Promise<VideoWithScenes[]> => {
  try {
    const { collection } = await createVectorDbClient()

    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const allDocs = await collection.get({
      include: ['metadatas', 'documents'],
    })
    const cameras = new Set<string>()
    const colors = new Set<string>()
    const locations = new Set<string>()
    const faces = new Set<string>()
    const objects = new Set<string>()
    const shotTypes = new Set<string>()
    const emotions = new Set<string>()

    const videosDict: Record<string, VideoWithScenes> = {}

    for (let i = 0; i < allDocs.metadatas.length; i++) {
      const metadata = allDocs.metadatas[i]
      if (!metadata) continue

      const source = metadata.source?.toString()
      if (!source) {
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
          location: metadata.location?.toString(),
        }
      }

      const scene: Scene = metadataToScene(metadata, allDocs.ids[i])

      // Collect per-video faces, emotions, objects, shot types
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

      if (scene.camera) cameras.add(scene.camera.toString())
      if (scene.dominantColorName) colors.add(scene.dominantColorName.toString())
      if (scene.location) locations.add(scene.location.toString())
      if (scene.faces) scene.faces.forEach((f: string) => faces.add(f))
      if (scene.objects) scene.objects.forEach((o: string) => objects.add(o))
      if (scene.emotions) scene.emotions.forEach((o) => emotions.add(o.emotion))
      if (scene.shotType) shotTypes.add(scene.shotType.toString())
      if (scene) videosDict[source].scenes.push(scene)
    }

    const videosList: VideoWithScenes[] = []
    for (const video of Object.values(videosDict)) {
      if (video && video.scenes) {
        video.scenes?.sort((a, b) => a.startTime - b.startTime)
        video.sceneCount = video.scenes?.length
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
    logger.error('Error getting all videos:' + error)
    throw error
  }
}

async function getByVideoSource(videoSource: string): Promise<VideoWithScenes | null> {
  try {
    const { collection } = await createVectorDbClient()

    if (!collection) {
      throw new Error('Collection not initialized')
    }
    const video = new Map()

    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const result = await collection?.get({
      where: {
        source: {
          $in: [videoSource],
        },
      },
      include: ['metadatas', 'documents'],
    })
    const cameras = new Set<string>()
    const colors = new Set<string>()
    const locations = new Set<string>()
    const faces = new Set<string>()
    const objects = new Set<string>()
    const shotTypes = new Set<string>()
    const emotions = new Set<string>()

    for (const [index, metadata] of result.metadatas.entries()) {
      const source = metadata?.source?.toString()

      if (!metadata || !source) {
        return null
      }

      if (!video.get(source)) {
        video.set(source, {
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
        })
      }

      const scene: Scene = metadataToScene(metadata, result.ids[index], result.documents[index])
      if (scene) video.get(source).scenes.push(scene)
      if (scene.faces)
        scene.faces.forEach((f) => {
          if (!video.get(source).faces?.includes(f)) video.get(source).faces.push(f)
        })
      if (scene.emotions)
        scene.emotions.forEach((e) => {
          if (!video.get(source).emotions?.includes(e.emotion)) video.get(source).emotions.push(e.emotion)
        })
      if (scene.objects)
        scene.objects.forEach((o) => {
          if (!video.get(source).objects?.includes(o)) video.get(source).objects.push(o)
        })
      if (scene.shotType && !video.get(source).shotTypes?.includes(scene.shotType))
        video.get(source).shotTypes.push(scene.shotType)

      if (scene.camera) cameras.add(scene.camera.toString())
      if (scene.dominantColorName) colors.add(scene.dominantColorName.toString())
      if (scene.location) locations.add(scene.location.toString())
      if (scene.faces) scene.faces.forEach((f: string) => faces.add(f))
      if (scene.objects) scene.objects.forEach((o: string) => objects.add(o))
      if (scene.emotions) scene.emotions.forEach((o) => emotions.add(o.emotion))
      if (scene.shotType) shotTypes.add(scene.shotType.toString())
    }

    const data = Array.from(video.values())[0] as VideoWithScenes
    if (data) {
      return {
        ...data,
        scenes: data.scenes.sort((a, b) => a.startTime - b.startTime) ?? [],
      }
    }
    return null
  } catch (error) {
    logger.error('Error getting video by source: ' + error)
    return null
  }
}

async function updateMetadata(scene: Scene): Promise<void> {
  try {
    const { collection, visual_collection, audio_collection } = await createVectorDbClient()

    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const vector = await sceneToVectorFormat(scene)

    const existing = await collection.get({
      ids: [scene.id],
      include: ['metadatas', 'documents', 'embeddings'],
    })

    if (existing.ids && existing.ids.length === 0) {
      logger.warn('No scene found to update')
    }

    if (existing.ids && existing.ids.length > 0) {
      const embeddings = await getEmbeddings([vector.text])

      await collection.update({
        ids: [scene.id],
        metadatas: [vector.metadata],
        documents: [vector.text],
        embeddings: embeddings,
      })
    }

    if (visual_collection) {
      const visualExists = await visual_collection.get({
        ids: [scene.id],
        include: ['metadatas', 'documents'],
      })

      if (visualExists.ids && visualExists.ids.length > 0) {
        await visual_collection.update({
          ids: [scene.id],
          metadatas: [vector.metadata],
        })
      }
    }

    if (audio_collection) {
      const audioExists = await audio_collection.get({
        ids: [scene.id],
        include: ['metadatas', 'documents'],
      })

      if (audioExists.ids && audioExists.ids.length > 0) {
        await audio_collection.update({
          ids: [scene.id],
          metadatas: [vector.metadata],
        })
      }
    }
  } catch (error) {
    logger.error('Error updating documents: ' + error)
    throw error
  }
}

async function getVideoWithScenesBySceneIds(sceneIds: string[]): Promise<Scene[]> {
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
async function updateScenesSource(oldSource: string, newSource: string): Promise<void> {
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
async function deleteByVideoSource(source: string): Promise<void> {
  const { collection, visual_collection, audio_collection } = await createVectorDbClient()

  if (!collection) throw new Error('Collection not initialized')

  await collection.delete({ where: { source: source } })

  if (visual_collection) await visual_collection.delete({ where: { source: source } })
  if (audio_collection) await audio_collection.delete({ where: { source: source } })
}

async function getScenesByYear(year: number): Promise<{
  videos: VideoWithScenes[]
  stats: YearStats
}> {
  try {
    const cacheKey = `videos:yearly:${year}`

    const { collection } = await createVectorDbClient()

    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const cached = await getCache<{ videos: VideoWithScenes[]; stats: YearStats }>(cacheKey)
    if (cached) {
      return cached
    }

    const start = new Date(`${year}-01-01T00:00:00.000Z`).getTime()
    const end = new Date(`${year}-12-31T23:59:59.999Z`).getTime()

    const allDocs = await collection.get({
      include: ['metadatas', 'documents'],
      where: {
        $and: [{ createdAt: { $gte: start } }, { createdAt: { $lte: end } }],
      },
    })

    const videosDict: Record<string, VideoWithScenes> = {}
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
          if (!videosDict[source]) {
            let locationName
            if (metadata.location?.toString()) {
              locationName = await getLocationName(metadata.location?.toString())
            }

            videosDict[source] = {
              source,
              duration: parseFloat(metadata.duration?.toString() || '0.00'),
              aspectRatio: metadata.aspectRatio?.toString() || 'Unknown',
              camera: metadata.camera?.toString() || 'Unknown Camera',
              category: metadata.category?.toString() || 'Uncategorized',
              createdAt: parseInt(metadata.createdAt?.toString() || '0'),
              scenes: [],
              sceneCount: 0,
              thumbnailUrl: metadata.thumbnailUrl?.toString(),
              faces: [],
              emotions: [],
              objects: [],
              shotTypes: [],
              location: locationName,
            }
          }

          videosDict[source].scenes.push(scene)

          if (scene.faces)
            scene.faces.forEach((f) => {
              if (!videosDict[source].faces?.includes(f) && !f.toLocaleLowerCase().includes('unknown'))
                videosDict[source].faces.push(f)
            })
          if (scene.emotions)
            scene.emotions.forEach((e) => {
              if (
                !videosDict[source].emotions?.includes(e.emotion) &&
                !e.emotion.toLocaleLowerCase().includes('unknown')
              )
                videosDict[source].emotions.push(e.emotion)
            })
          if (scene.objects)
            scene.objects.forEach((o) => {
              if (!videosDict[source].objects?.includes(o) && !o.toLocaleLowerCase().includes('person'))
                videosDict[source].objects.push(o)
            })
          if (scene.shotType && !videosDict[source].shotTypes?.includes(scene.shotType))
            videosDict[source].shotTypes.push(scene.shotType)
        }
      }
    }

    const videosList = Object.values(videosDict).map((video) => {
      video.scenes.sort((a, b) => a.startTime - b.startTime)
      video.sceneCount = video.scenes.length
      return video
    })

    videosList.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime()
      const timeB = new Date(b.createdAt).getTime()
      return timeA - timeB
    })

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

    if (!IS_TESTING) {
      await setCache(cacheKey, result, 300)
    }

    return result
  } catch (error) {
    logger.error('Error getting scenes by year: ' + error)
    throw error
  }
}

async function embedVisuals(documents: EmbeddingVisualInput[]): Promise<void> {
  try {
    const validDocuments = documents.filter(
      (d) => d.id && d.embedding && Array.isArray(d.embedding) && d.embedding.length > 0 && d.metadata
    )

    if (validDocuments.length === 0) {
      logger.warn('No valid visual embeddings to store. Check for missing IDs or empty embeddings.')
      return
    }

    const { visual_collection } = await createVectorDbClient()
    if (!visual_collection) {
      throw new Error('Visual collection not initialized')
    }

    const sanitizedDocuments = validDocuments.map((doc) => ({
      ...doc,
      metadata: sanitizeMetadata(doc.metadata || {}),
    }))

    const ids = sanitizedDocuments.map((d) => d.id)
    const metadatas = sanitizedDocuments.map((d) => d.metadata || {})
    const embeddings = sanitizedDocuments.map((d) => d.embedding)

    const dimensions = new Set(embeddings.map((e) => e.length))
    if (dimensions.size > 1) {
      throw new Error(
        `Inconsistent visual embedding dimensions: ${Array.from(dimensions).join(', ')}. Expected 512 (CLIP).`
      )
    }

    const expectedDimension = 512
    if (embeddings[0].length !== expectedDimension) {
      throw new Error(`Visual embedding dimension mismatch: got ${embeddings[0].length}, expected ${expectedDimension}`)
    }

    for (let i = 0; i < embeddings.length; i++) {
      const hasInvalidValues = embeddings[i].some((val) => !isFinite(val) || isNaN(val))
      if (hasInvalidValues) {
        throw new Error(`Visual embedding at index ${i} contains invalid values (NaN or Infinity)`)
      }
    }

    await visual_collection.add({
      ids,
      metadatas,
      embeddings,
    })
  } catch (error) {
    logger.error('Error embedding visual documents')
    throw error
  }
}

async function embedAudios(documents: EmbeddingAudioInput[]): Promise<void> {
  try {
    const validDocuments = documents.filter(
      (d) => d.id && d.embedding && Array.isArray(d.embedding) && d.embedding.length > 0 && d.metadata
    )

    if (validDocuments.length === 0) {
      logger.warn('No valid audio embeddings to store')
      return
    }

    const { audio_collection } = await createVectorDbClient()
    if (!audio_collection) {
      throw new Error('Audio collection not initialized')
    }

    const sanitizedDocuments = validDocuments.map((doc) => ({
      ...doc,
      metadata: sanitizeMetadata(doc.metadata || {}),
    }))

    const ids = sanitizedDocuments.map((d) => d.id)
    const metadatas = sanitizedDocuments.map((d) => d.metadata || {})
    const embeddings = sanitizedDocuments.map((d) => d.embedding)

    const dimensions = new Set(embeddings.map((e) => e.length))
    if (dimensions.size > 1) {
      throw new Error(
        `Inconsistent audio embedding dimensions: ${Array.from(dimensions).join(', ')}. Expected 512 (CLAP).`
      )
    }

    const expectedDimension = 512
    if (embeddings[0].length !== expectedDimension) {
      throw new Error(`Audio embedding dimension mismatch: got ${embeddings[0].length}, expected ${expectedDimension}`)
    }

    for (let i = 0; i < embeddings.length; i++) {
      const hasInvalidValues = embeddings[i].some((val) => !isFinite(val) || isNaN(val))
      if (hasInvalidValues) {
        throw new Error(`Audio embedding at index ${i} contains invalid values (NaN or Infinity)`)
      }
    }

    await audio_collection.add({
      ids,
      metadatas,
      embeddings,
    })
  } catch (error) {
    logger.error('Error embedding audio documents')
    throw error
  }
}

async function getAllSceneEmbeddings(
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

async function getAllDocs(): Promise<Scene[]> {
  try {
    const { collection } = await createVectorDbClient()

    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const allDocs = await collection?.get({
      include: ['metadatas', 'documents'],
    })

    return allDocs.metadatas.map((metadata, index) =>
      metadataToScene(metadata, allDocs.ids[index], allDocs.documents[index])
    )
  } catch (error) {
    logger.error('Error getting docs: ' + error)
    throw error
  }
}

async function getVideosMetadataSummary(): Promise<VideoMetadataSummary> {
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
        .map(([name]) => ({ name, count: 1 }))

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

async function getSceneBySourceAndStartTime(source: string, startTime: number): Promise<Scene | null> {
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

async function getScenesCount(): Promise<number> {
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

export {
  embedDocuments,
  getAllVideos,
  updateMetadata,
  getByVideoSource,
  getVideoWithScenesBySceneIds,
  getUniqueVideoSources,
  updateScenesSource,
  getScenesByYear,
  deleteByVideoSource,
  embedAudios,
  embedVisuals,
  getAllSceneEmbeddings,
  getAllDocs,
  getVideosMetadataSummary,
  getSceneBySourceAndStartTime,
  getScenesCount,
}
