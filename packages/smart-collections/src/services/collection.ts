import { metadataToScene } from '@vector/utils/shared'
import { COLLECTION_DEFINITIONS, COLLECTIONS_BATCH_SIZE } from '../constants/collections'
import { getVisualEmbeddingForText, getAudioEmbeddingForText, getEmbeddings } from '@vector/services/embedding'
import { getAllSceneEmbeddings, getScenesCount } from '@vector/services/vectorDb'
import { logger } from '@shared/services/logger'
import { Scene } from '@shared/types/scene'
import { CollectionEmbeddings, CollectionVideosMap } from '@smart-collections/types'
import { passesFilters } from '@smart-collections/scoring/scene-filters'
import { calculateSceneScore } from '@smart-collections/scoring/metadata'
import { averageEmbeddings } from '@smart-collections/utils/embedding'

export async function generateSmartCollections() {
  logger.info('Starting smart collections generation...')
  const collectionVideos: CollectionVideosMap = new Map()

  const collectionEmbeddings: Record<string, CollectionEmbeddings> = {}

  // Step 1: Generate embeddings for all collections
  // Convert the collection definition into embedding that we can use later on to check the vector DB for each collection definitions

  logger.info('Generating collection embeddings...')

  for (const collectionName in COLLECTION_DEFINITIONS) {
    const definition = COLLECTION_DEFINITIONS[collectionName]
    const visualEmbeds: number[][] = []
    const audioEmbeds: number[][] = []
    const textEmbeds: number[][] = []

    // Visual embeddings
    if (Array.isArray(definition.visual_queries) && definition.visual_queries.length > 0) {
      for (const query of definition.visual_queries) {
        try {
          visualEmbeds.push(await getVisualEmbeddingForText(query.toString()))
        } catch (error) {
          logger.warn(`Failed to get visual embedding for "${query}": ${error}`)
        }
      }
    }

    // Audio embeddings
    if (Array.isArray(definition.audio_queries) && definition.audio_queries.length > 0) {
      for (const query of definition.audio_queries) {
        try {
          audioEmbeds.push(await getAudioEmbeddingForText(query.toString()))
        } catch (error) {
          logger.warn(`Failed to get audio embedding for "${query}": ${error}`)
        }
      }
    }

    // Text embeddings (from description)
    if (definition.description) {
      try {
        const embeddings = await getEmbeddings([definition.description.toString()])
        textEmbeds.push(embeddings[0])
      } catch (error) {
        logger.warn(`Failed to get text embedding for "${collectionName}": ${error}`)
      }
    }

    // Also create text embeddings from visual queries as fallback
    if (textEmbeds.length === 0 && Array.isArray(definition.visual_queries) && definition.visual_queries.length > 0) {
      for (const query of definition.visual_queries.slice(0, 3)) {
        try {
          const embeddings = await getEmbeddings([query.toString()])
          textEmbeds.push(embeddings[0])
        } catch (error) {
          logger.warn(`Failed to get text embedding from visual query: ${error}`)
        }
      }
    }

    // Average embeddings
    const visualConcept = averageEmbeddings(visualEmbeds)
    const audioConcept = averageEmbeddings(audioEmbeds)
    const textConcept = averageEmbeddings(textEmbeds)

    collectionEmbeddings[collectionName] = {
      visual: visualConcept,
      audio: audioConcept,
      text: textConcept,
      definition: definition,
    }
  }

  const count = await getScenesCount()
  const totalBatches = Math.ceil(count / COLLECTIONS_BATCH_SIZE)

  // Step 2: Process scenes in batches
  for (let i = 0; i < count; i += COLLECTIONS_BATCH_SIZE) {
    const batch = await getAllSceneEmbeddings(COLLECTIONS_BATCH_SIZE, i)
    const batchNumber = Math.floor(i / COLLECTIONS_BATCH_SIZE) + 1

    for (const sceneData of batch) {
      const { id: sceneId, metadata, visualEmbedding, audioEmbedding, textEmbedding } = sceneData
      const scene: Scene = metadataToScene(metadata, sceneId)
      const source = scene.source

      // Process each collection for this scene
      for (const collectionName in collectionEmbeddings) {
        const collectionData = collectionEmbeddings[collectionName]
        const definition = collectionData.definition

        // Apply filters first
        if (!passesFilters(scene, definition.filters || {})) {
          continue
        }

        // Calculate scoring
        const scoringResult = calculateSceneScore(
          scene,
          sceneId,
          collectionName,
          collectionData,
          visualEmbedding,
          audioEmbedding,
          textEmbedding
        )

        // Check if scene matches collection
        if (scoringResult.matched) {
          // Initialize collection map if needed
          if (!collectionVideos.has(collectionName)) {
            collectionVideos.set(collectionName, new Map())
          }

          const collectionMap = collectionVideos.get(collectionName)!

          // Initialize video entry if needed
          if (!collectionMap.has(source)) {
            collectionMap.set(source, {
              scenes: [],
              match_type: 'hybrid',
            })
          }

          // Add scene to collection
          const videoEntry = collectionMap.get(source)!
          videoEntry.scenes.push({
            sceneId,
            confidence: scoringResult.finalScore,
          })
        }
      }
    }

    logger.debug(`Batch ${batchNumber}/${totalBatches} complete`)
  }

  // Step 3: Sort scenes by confidence within each collection
  for (const [collectionName, videoMap] of collectionVideos) {
    for (const [_source, videoData] of videoMap) {
      videoData.scenes.sort((a, b) => b.confidence - a.confidence)
    }
    logger.debug(
      `Collection "${collectionName}": ${videoMap.size} videos, ${Array.from(videoMap.values()).reduce((sum, v) => sum + v.scenes.length, 0)} scenes`
    )
  }

  logger.info(`Smart collections generation complete. Generated ${collectionVideos.size} collections.`)
  return collectionVideos
}
