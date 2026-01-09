import { metadataToScene } from '@vector/utils/shared'
import { Metadata, Where, WhereDocument } from 'chromadb'
import { VideoWithScenesAndMatch } from '@shared/types/video'
import { Scene } from '@shared/types/scene'
import { VideoSearchParams } from '@shared/types/search'
import { logger } from '@shared/services/logger'
import { createVectorDbClient, getByVideoSource } from '@vector/services/vectorDb'
import { getAudioEmbeddingForText, getEmbeddings, getVisualEmbeddingForText } from '@vector/services/embedding'

export function applyFilters(
  query: VideoSearchParams,
  projectsVideSources?: string[]
): {
  where: Where | WhereDocument
  whereDocument: WhereDocument | undefined
} {
  const conditions: Where[] = []
  let whereDocument: WhereDocument | undefined = undefined
  const documentConditions: WhereDocument[] = []

  if (projectsVideSources && projectsVideSources.length > 0) {
    conditions.push({
      source: { $in: projectsVideSources },
    })
  }
  if (query.aspectRatio) {
    conditions.push({
      aspectRatio: { $in: Array.isArray(query.aspectRatio) ? query.aspectRatio : [query.aspectRatio] },
    })
  }

  if (query.locations.length > 0) {
    conditions.push({
      location: { $in: query.locations },
    })
  }
  if (query.camera) {
    conditions.push({
      camera: { $in: Array.isArray(query.camera) ? query.camera : [query.camera] },
    })
  }

  if (query.shotType) {
    conditions.push({ shotType: query.shotType })
  }

  if (query.faces?.length > 0) {
    conditions.push({
      faces: { $in: query.faces },
    })
  }

  if (query.objects?.length > 0) {
    conditions.push({
      objects: { $in: query.objects },
    })
  }

  if (query.emotions?.length > 0) {
    conditions.push({
      emotions: { $in: query.emotions },
    })
  }

  // Transcription search
  if (query.transcriptionRegex) {
    documentConditions.push({
      $regex: query.transcriptionRegex,
    })
  }

  if (query.transcriptionQuery) {
    for (const text of query.transcriptionQuery.split(',')) {
      documentConditions.push({
        $contains: text,
      })
    }
  }
  // Detected text search
  if (query.detectedTextRegex) {
    documentConditions.push({
      $regex: query.detectedTextRegex,
    })
  }

  if (query.detectedText) {
    for (const text of query.detectedText.split(',')) {
      documentConditions.push({
        $contains: text,
      })
    }
  }

  // Exclusion
  if (query.excludeTranscriptionRegex) {
    documentConditions.push({
      $not_regex: query.excludeTranscriptionRegex,
    })
  }

  const where = conditions.length === 1 ? conditions[0] : conditions.length > 1 ? { $and: conditions } : {}
  whereDocument =
    documentConditions.length === 0
      ? undefined
      : documentConditions.length === 1
        ? documentConditions[0]
        : { $and: documentConditions }

  return { where, whereDocument }
}

export async function getSimilarScenes(
  referenceSceneIds: string[],
  nResults: number = 30,
  projectVideoSources?: string[]
): Promise<Scene[]> {
  try {
    const { collection } = await createVectorDbClient()
    if (!collection) throw new Error('Collection not initialized')

    const referenceScene = await collection.get({
      ids: referenceSceneIds,
      include: ['metadatas', 'embeddings'],
    })

    if (!referenceScene.embeddings?.[0]) {
      throw new Error('Reference scene not found')
    }

    const referenceEmbedding = referenceScene.embeddings[0]

    // Build where clause for project filtering
    const whereClause =
      projectVideoSources && projectVideoSources.length > 0 ? { source: { $in: projectVideoSources } } : undefined

    const vectorQuery = await collection.query({
      queryEmbeddings: [referenceEmbedding],
      nResults: nResults + referenceSceneIds.length,
      where: whereClause, // Add the where clause here
      include: ['metadatas', 'distances'],
    })

    if (!vectorQuery.metadatas[0] || !vectorQuery.ids[0]) {
      return []
    }

    const scenes: Scene[] = []
    for (let i = 0; i < vectorQuery.metadatas[0].length; i++) {
      const id = vectorQuery.ids[0][i]

      // Skip the reference scene itself
      if (referenceSceneIds.includes(id)) continue // Fixed: was !referenceSceneIds.includes(id)

      const metadata = vectorQuery.metadatas[0][i]
      if (!metadata) continue

      scenes.push(metadataToScene(metadata, id))
    }

    return scenes.slice(0, nResults)
  } catch (error) {
    logger.error('Error in similarity search: ' + error)
    throw error
  }
}

export async function searchScenes(
  query: VideoSearchParams,
  nResults: undefined | number = undefined,
  onlyMatchedScenes?: boolean,
  projectVideoSources?: string[]
): Promise<VideoWithScenesAndMatch[]> {
  try {
    const { collection, audio_collection, visual_collection } = await createVectorDbClient()

    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const { where: whereClause, whereDocument } = applyFilters(query, projectVideoSources)

    logger.debug(whereClause)
    logger.debug(whereDocument)

    if (Object.keys(whereClause).length === 0 && !whereDocument && !query.semanticQuery) {
      return []
    }

    let finalScenes: { metadatas: (Metadata | null)[]; ids: string[] } | null = null

    if (query.semanticQuery) {
      const queryEmbeddings = await getEmbeddings([query.semanticQuery])
      const visualEmbedding = await getAudioEmbeddingForText(query.semanticQuery)
      const audioEmbedding = await getVisualEmbeddingForText(query.semanticQuery)

      if (visualEmbedding && visual_collection) {
        const vectorQuery = await visual_collection.query({
          queryEmbeddings: [visualEmbedding],
          nResults,
          where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
          whereDocument,
          include: ['metadatas', 'documents'],
        })

        if (vectorQuery.metadatas.length > 0) {
          finalScenes = { metadatas: vectorQuery.metadatas[0], ids: vectorQuery.ids[0] }
        }
      }
      if (audioEmbedding && audio_collection) {
        const vectorQuery = await audio_collection.query({
          queryEmbeddings: [audioEmbedding],
          nResults,
          where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
          whereDocument,
          include: ['metadatas', 'documents'],
        })

        if (vectorQuery.metadatas.length > 0) {
          finalScenes = { metadatas: vectorQuery.metadatas[0], ids: vectorQuery.ids[0] }
        }
      }
      const vectorQuery = await collection.query({
        queryEmbeddings,
        nResults,
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        whereDocument,
        include: ['metadatas', 'documents'],
      })

      if (vectorQuery.metadatas.length > 0) {
        finalScenes = { metadatas: vectorQuery.metadatas[0], ids: vectorQuery.ids[0] }
      } else {
        // Fallback to Metadata filtering
        const result = await collection?.get({
          where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
          whereDocument: whereDocument,
          include: ['metadatas', 'documents'],
          limit: nResults,
        })
        finalScenes = { metadatas: result.metadatas, ids: result.ids }
      }
    } else {
      const result = await collection?.get({
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        whereDocument: whereDocument,
        include: ['metadatas', 'documents'],
        limit: nResults,
      })
      finalScenes = { metadatas: result.metadatas, ids: result.ids }
    }

    const videosDict: Record<string, VideoWithScenesAndMatch> = {}

    if (finalScenes && finalScenes.metadatas && finalScenes.ids) {
      for (let i = 0; i < finalScenes.metadatas.length; i++) {
        const metadata = finalScenes.metadatas[i]
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
            createdAt: Number(metadata.createdAt) || 0,
            scenes: [],
            sceneCount: 0,
            thumbnailUrl: metadata.thumbnailUrl?.toString(),
            faces: [],
            emotions: [],
            objects: [],
            shotTypes: [],
          }
        }

        const scene = metadataToScene(metadata, finalScenes.ids[i])
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
    }

    const videosList: VideoWithScenesAndMatch[] = []
    for (const video of Object.values(videosDict)) {
      const sceneMap = new Map<string, Scene & { matched: boolean }>()

      if (onlyMatchedScenes) {
        for (const scene of video.scenes) {
          if (!sceneMap.has(scene.id)) {
            sceneMap.set(scene.id, { ...scene, matched: true })
          }
        }

        video.scenes = Array.from(sceneMap.values())
        video.scenes.sort((a, b) => a.startTime - b.startTime)
        video.sceneCount = video.scenes.length
        videosList.push(video)
      } else {
        const videoWithScenes = await getByVideoSource(decodeURIComponent(video.source))

        if (videoWithScenes) {
          for (const scene of video.scenes) {
            if (!sceneMap.has(scene.id)) {
              sceneMap.set(scene.id, { ...scene, matched: true })
            }
          }
          for (const scene of videoWithScenes.scenes) {
            if (!sceneMap.has(scene.id)) {
              sceneMap.set(scene.id, { ...scene, matched: false })
            }
          }
          video.scenes = Array.from(sceneMap.values())
          video.scenes.sort((a, b) => a.startTime - b.startTime)
          video.sceneCount = video.scenes.length
          videosList.push(video)
        }
      }
    }

    videosList.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime()
      const timeB = new Date(b.createdAt).getTime()

      return timeB - timeA
    })

    return videosList
  } catch (error) {
    logger.error('Error querying collection: ' + error)
    throw error
  }
}
