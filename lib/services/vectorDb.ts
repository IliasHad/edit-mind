import { ChromaClient, Collection } from 'chromadb'
import { EmbeddingInput, CollectionStatistics } from '../types/vector'
import { Video, VideoWithScenes } from '../types/video'
import { Scene } from '../types/scene'
import { SearchQuery } from '../types/search'
import { metadataToScene, sceneToVectorFormat } from '../utils/embed'
import { CHROMA_HOST, CHROMA_PORT, COLLECTION_NAME } from '@/lib/constants'

let client: ChromaClient | null = null
let collection: Collection | null = null

const initialize = async (name: string = COLLECTION_NAME): Promise<void> => {
  if (client && collection) return

  try {
    client = new ChromaClient({
      path: `http://${CHROMA_HOST}:${CHROMA_PORT}`,
    })

    await client.heartbeat()

    collection = await client.getOrCreateCollection({
      name,
      embeddingFunction: undefined, // Default Chroma embeddings
    })
  } catch (error) {
    console.error(
      JSON.stringify({
        status: 'error',
        message: `Initialization failed: ${error instanceof Error ? error.message : String(error)}`,
        hint: 'Make sure ChromaDB server is running. Start it with: docker run -p 8000:8000 chromadb/chroma',
      })
    )
    throw error
  }
}

async function embedDocuments(documents: EmbeddingInput[]): Promise<void> {
  try {
    await initialize()
    if (!collection) throw new Error('Collection not initialized')

    const ids = documents.map((d) => d.id)
    const metadatas = documents.map((d) => d.metadata || {})
    const documentTexts = documents.map((d) => d.text)

    await collection.add({
      ids,
      metadatas,
      documents: documentTexts,
    })
  } catch (error) {
    console.error('Error embedding documents:', error)
    throw error
  }
}

async function getStatistics(): Promise<CollectionStatistics> {
  try {
    await initialize()

    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const count = await collection.count()

    const results = await collection.get({
      limit: count,
      include: ['metadatas', 'embeddings', 'documents'],
    })

    const metadataKeysSet = new Set<string>()
    results.metadatas?.forEach((metadata) => {
      if (metadata) {
        Object.keys(metadata).forEach((key) => metadataKeysSet.add(key))
      }
    })

    const embeddingDimension = results.embeddings && results.embeddings.length > 0 ? results.embeddings[0].length : null

    const statistics: CollectionStatistics = {
      name: COLLECTION_NAME,
      totalDocuments: count,
      embeddingDimension,
      metadataKeys: Array.from(metadataKeysSet),
      documentIds: results.ids || [],
    }

    return statistics
  } catch (error) {
    console.error('Error getting statistics:', error)
    throw error
  }
}

const getAllVideos = async (): Promise<Video[]> => {
  try {
    await initialize()

    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const allDocs = await collection.get({
      include: ['metadatas'],
    })

    const uniqueVideos: Record<string, Video> = {}

    if (allDocs && allDocs.metadatas) {
      for (const metadata of allDocs.metadatas) {
        if (!metadata) continue

        const source = metadata.source as string
        if (source && !uniqueVideos[source]) {
          uniqueVideos[source] = {
            source,
            duration: parseFloat(metadata.duration?.toString() || '0.00'),
            aspect_ratio: metadata.aspect_ratio?.toString() || 'N/A',
            camera: metadata.camera?.toString() || 'N/A',
            category: metadata.category?.toString() || 'Uncategorized',
            createdAt: metadata.createdAt?.toString() || 'N/A',
            thumbnailUrl: metadata.thumbnailUrl?.toString(),
          }
        }
      }
    }

    return Object.values(uniqueVideos)
  } catch (error) {
    console.error('Error getting all videos:', error)
    throw error
  }
}
const getAllVideosWithScenes = async (): Promise<VideoWithScenes[]> => {
  try {
    await initialize()

    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const allDocs = await collection.get({
      include: ['metadatas', 'documents', 'embeddings'],
    })

    const videosDict: Record<string, VideoWithScenes> = {}

    if (allDocs && allDocs.metadatas && allDocs.ids) {
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
            aspect_ratio: metadata.aspect_ratio?.toString() || 'N/A',
            camera: metadata.camera?.toString() || 'N/A',
            category: metadata.category?.toString() || 'Uncategorized',
            createdAt: metadata.createdAt?.toString() || 'N/A',
            scenes: [],
            sceneCount: 0,
            thumbnailUrl: metadata.thumbnailUrl?.toString(),
          }
        }

        const scene: Scene = metadataToScene(metadata, allDocs.ids[i])
        videosDict[source].scenes.push(scene)
      }
    }

    const videosList: VideoWithScenes[] = []
    for (const video of Object.values(videosDict)) {
      video.scenes.sort((a, b) => a.startTime - b.startTime)
      video.sceneCount = video.scenes.length
      videosList.push(video)
    }

    videosList.sort((a, b) => a.source.localeCompare(b.source))

    return videosList
  } catch (error) {
    console.error('Error getting all videos with scenes:', error)
    throw error
  }
}
const queryCollection = async (query: SearchQuery, nResults = 1000): Promise<Scene[]> => {
  try {
    await initialize()

    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const conditions: Record<string, any>[] = []

    if (query.aspect_ratio) {
      const aspectRatioValues = Array.isArray(query.aspect_ratio) ? query.aspect_ratio : [query.aspect_ratio]
      conditions.push({ aspect_ratio: { $in: aspectRatioValues } })
    }
    if (query.camera) {
      const cameraValues = Array.isArray(query.camera) ? query.camera : [query.camera]
      conditions.push({ camera: { $in: cameraValues } })
    }
    if (query.shot_type) {
      conditions.push({ shot_type: query.shot_type })
    }

    let whereClause: Record<string, any> = {}

    if (conditions.length === 1) {
      whereClause = conditions[0]
    } else if (conditions.length > 1) {
      whereClause = { $and: conditions }
    }
    let result
    if (conditions.length === 0) {
      result = await collection.get({
        include: ['metadatas', 'documents'],
      })
    } else {
      result = await collection.get({
        where: whereClause,
        limit: nResults,
        include: ['metadatas', 'documents', 'embeddings'],
      })
    }

    let filteredScenes: Scene[] = result.metadatas.map((metadata, index) =>
      metadataToScene(metadata, result.ids![index])
    )

    if (result.metadatas && result.metadatas.length > 0 && result.ids && result.ids.length > 0) {
      filteredScenes = result.metadatas
        .map((metadata, index) => metadataToScene(metadata, result.ids![index]))
        .filter((scene: Scene) => {
          let matches = true

          // Filter by faces
          if (query.faces && query.faces.length > 0) {
            const sceneFaces = scene.faces.map((f) => f.toLowerCase())
            matches = matches && query.faces.some((qFace) => sceneFaces.includes(qFace.toLowerCase()))
          }

          // Filter by objects
          if (query.objects && query.objects.length > 0) {
            const sceneObjects = scene.objects.map((o) => o.toLowerCase())
            matches = matches && query.objects.some((qObject) => sceneObjects.includes(qObject.toLowerCase()))
          }

          // Filter by emotions
          if (query.emotions && query.emotions.length > 0) {
            const sceneEmotions = scene.emotions.map((e) => e.emotion.toLowerCase())
            matches = matches && query.emotions.some((qEmotion) => sceneEmotions.includes(qEmotion.toLowerCase()))
          }

          // Filter by transcription query
          if (query.transcriptionQuery) {
            matches = matches && scene.transcription.toLowerCase().includes(query.transcriptionQuery.toLowerCase())
          }
          // Filter by detected text query
          if (query.detectedText) {
            matches = matches && scene.detectedText.includes(query.detectedText.toLowerCase())
          }

          return matches
        })
    }

    return filteredScenes.slice(0, nResults)
  } catch (error) {
    console.error('Error querying collection:', error)
    throw error
  }
}

async function filterExistingVideos(videoSources: string[]): Promise<string[]> {
  if (videoSources.length === 0) {
    return []
  }
  try {
    await initialize()
    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const results = await collection.get({
      where: {
        source: {
          $in: videoSources,
        },
      },
      include: ['metadatas'],
    })

    const existingSources = new Set(results.metadatas.map((m) => m!.source))
    return videoSources.filter((source) => !existingSources.has(source))
  } catch (error) {
    console.error('Error filtering existing videos:', error)
    return videoSources
  }
}

async function getByVideoSource(videoSource: string): Promise<Scene[]> {
  try {
    await initialize()
    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const result = await collection.get({
      where: {
        source: {
          $in: [videoSource],
        },
      },
      include: ['metadatas'],
    })
    const filteredScenes: Scene[] = result.metadatas.map((metadata, index) =>
      metadataToScene(metadata, result.ids![index])
    )
    return filteredScenes
  } catch (error) {
    console.error('Error filtering existing videos:', error)
    return []
  }
}

async function updateDocuments(scene: Scene): Promise<void> {
  try {
    await initialize()
    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const existing = await collection.get({
      where: {
        $and: [{ source: scene?.source }, { startTime: scene?.startTime }, { endTime: scene?.endTime }],
      },
      include: ['metadatas', 'documents', 'embeddings'],
    })

    if (!existing.ids || existing.ids.length === 0) {
      console.warn(`Document ${scene.id} not found, skipping`)
      return
    }

    await collection.update({
      ids: [scene.id],
      metadatas: [
        {
          ...sceneToVectorFormat(scene).metadata,
        },
      ],
    })
  } catch (error) {
    console.error('Error updating documents:', error)
    throw error
  }
}

async function updateMetadata(metadata: Scene): Promise<void> {
  await updateDocuments(metadata)
}
export {
  embedDocuments,
  getStatistics,
  initialize,
  getAllVideosWithScenes,
  getAllVideos,
  queryCollection,
  filterExistingVideos,
  updateDocuments,
  updateMetadata,
  getByVideoSource,
}
