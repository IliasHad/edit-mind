import { metadataToScene } from '@vector/utils/shared'
import type { VideoWithScenesAndMatch } from '@shared/types/video'
import type { Scene } from '@shared/types/scene'
import type { VideoSearchParams } from '@shared/types/search'
import { logger } from '@shared/services/logger'
import { createVectorDbClient } from '@vector/services/client'
import { getEmbeddings, getAudioEmbeddingForText, getVisualEmbeddingForText } from '@embedding-core/services'

import { getByVideoSource } from '@vector/services/db'
import { applyFilters } from '@search/utils/filters'
import { convertScenesToVideos } from '@vector/utils/videos'
import { collectScenesFromQuery } from '@search/utils/query'

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

    if (Object.keys(whereClause).length === 0 && !whereDocument && !query.semanticQuery) {
      return []
    }

    const finalScenes: Scene[] = []
    const scenesIds = new Set<string>()

    if (query.semanticQuery) {
      const queryEmbeddings = await getEmbeddings([query.semanticQuery])
      const visualEmbedding = await getVisualEmbeddingForText(query.semanticQuery)
      const audioEmbedding = await getAudioEmbeddingForText(query.semanticQuery)

      // Visual Collection Search
      if (visualEmbedding && visual_collection) {
        const vectorQuery = await visual_collection.query({
          queryEmbeddings: [visualEmbedding],
          nResults,
          where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
          whereDocument,
          include: ['metadatas', 'documents'],
        })

        collectScenesFromQuery(vectorQuery, scenesIds, finalScenes)
      }

      // Audio Collection Search
      if (audioEmbedding && audio_collection) {
        const vectorQuery = await audio_collection.query({
          queryEmbeddings: [audioEmbedding],
          nResults,
          where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
          whereDocument,
          include: ['metadatas', 'documents'],
        })

        collectScenesFromQuery(vectorQuery, scenesIds, finalScenes)
      }

      // Text Collection Search
      const vectorQuery = await collection.query({
        queryEmbeddings,
        nResults,
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        whereDocument,
        include: ['metadatas', 'documents'],
      })

      collectScenesFromQuery(vectorQuery, scenesIds, finalScenes)


      // Fallback to Metadata filtering (Use semantic query to search document text)
      const semanticWhereDocument = query.semanticQuery ? { $contains: query.semanticQuery } : undefined
      
      const combinedWhereDocument = whereDocument && semanticWhereDocument ? { $and: [whereDocument, semanticWhereDocument] } : semanticWhereDocument || whereDocument
     
      const result = await collection.get({
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        whereDocument: combinedWhereDocument,
        include: ['metadatas', 'documents'],
        limit: nResults,
      })

      if (result.metadatas.length > 0) {
        for (let index = 0; index < result.metadatas.length; index++) {
          const metadata = result.metadatas[index]
          const id = result.ids[index]
          const text = result.documents[index]

          if (!metadata || !id || !text) {
            continue
          }
          const scene = metadataToScene(metadata, id, text)
          if (!scenesIds.has(scene.id)) {
            finalScenes.push(scene)
          }
          scenesIds.add(scene.id)
        }
      }
    } else {
      const result = await collection?.get({
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        whereDocument: whereDocument,
        include: ['metadatas', 'documents'],
        limit: nResults,
      })
      for (let index = 0; index < result.metadatas.length; index++) {
        const metadata = result.metadatas[index]
        const id = result.ids[index]
        const text = result.documents[index]

        if (!metadata || !id || !text) {
          continue
        }
        const scene = metadataToScene(metadata, id, text)

        if (!scenesIds.has(scene.id)) {
          finalScenes.push(scene)
        }
        scenesIds.add(scene.id)
      }
    }

    if (finalScenes.length === 0) {
      return []
    }

    const videos = convertScenesToVideos(finalScenes) as VideoWithScenesAndMatch[]

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
