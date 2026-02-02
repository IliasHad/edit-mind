import { metadataToScene } from '@vector/utils/shared'
import { Metadata } from 'chromadb'
import { VideoWithScenesAndMatch } from '@shared/types/video'
import { Scene } from '@shared/types/scene'
import { VideoSearchParams } from '@shared/types/search'
import { logger } from '@shared/services/logger'
import { createVectorDbClient } from '@vector/services/client'
import { getEmbeddings } from '@embedding-core/services/extractors'
import { getAudioEmbeddingForText, getVisualEmbeddingForText } from '@embedding-core/services/extractors'

import { getByVideoSource } from '@vector/services/db'
import { applyFilters } from '@search/utils/filters'
import { convertScenesToVideos } from '@vector/utils/videos'

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

    let finalScenes: { metadatas: (Metadata | null)[]; ids: string[]; documents: (string | null)[] } | null = null

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
          finalScenes = {
            metadatas: vectorQuery.metadatas[0],
            ids: vectorQuery.ids[0],
            documents: vectorQuery.documents[0],
          }
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
          finalScenes = {
            metadatas: vectorQuery.metadatas[0],
            ids: vectorQuery.ids[0],
            documents: vectorQuery.documents[0],
          }
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
        finalScenes = {
          metadatas: vectorQuery.metadatas[0],
          ids: vectorQuery.ids[0],
          documents: vectorQuery.documents[0],
        }
      } else {
        // Fallback to Metadata filtering
        const result = await collection?.get({
          where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
          whereDocument: whereDocument,
          include: ['metadatas', 'documents'],
          limit: nResults,
        })
        finalScenes = { metadatas: result.metadatas, ids: result.ids, documents: result.documents }
      }
    } else {
      const result = await collection?.get({
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        whereDocument: whereDocument,
        include: ['metadatas', 'documents'],
        limit: nResults,
      })
      finalScenes = { metadatas: result.metadatas, ids: result.ids, documents: result.documents }
    }

    if (!finalScenes) {
      return []
    }

    const scenes = finalScenes.metadatas.map((m, i) => metadataToScene(m, finalScenes.ids[i], finalScenes.documents[i]))

    const videos = convertScenesToVideos(scenes) as VideoWithScenesAndMatch[]

    const videosList: VideoWithScenesAndMatch[] = []
    for (const video of videos) {
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
