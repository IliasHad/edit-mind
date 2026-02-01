import { embedVisuals } from '@vector/services/db'
import { createVectorDbClient } from '@vector/services/client'
import { VISUAL_BATCH_SIZE } from '@shared/constants/embedding'
import { logger } from '@shared/services/logger'
import { cleanupFrames, extractSceneFrames } from '@media-utils/utils/frame'
import { embedSceneFrames } from '../services'
import { Scene } from '@shared/schemas'
import { sceneToVectorFormat } from '@vector/utils/shared'

export const embedVisualScenes = async (scenes: Scene[], videoFullPath: string): Promise<void> => {
  try {
    const { visual_collection } = await createVectorDbClient()
    if (!visual_collection) {
      throw new Error('Visual Collection not initialized')
    }


    for (let i = 0; i < scenes.length; i += VISUAL_BATCH_SIZE) {
      const batch = scenes.slice(i, i + VISUAL_BATCH_SIZE)
      logger.info(`Processing batch ${i / VISUAL_BATCH_SIZE + 1}, scenes ${i} to ${i + batch.length - 1}`)

      const visualEmbeddingsPromise = batch.map(async (scene) => {
        try {
          const keyframes = await extractSceneFrames(scene.source, scene.startTime, scene.endTime, {
            framesPerScene: 5,
            format: 'jpg',
            quality: 2,
            maxWidth: 640,
          })

          const { metadata, id } = await sceneToVectorFormat(scene)

          const embedding = await embedSceneFrames(keyframes)

          await cleanupFrames(keyframes)

          return { id, embedding, metadata, success: true }
        } catch (error) {
          logger.error(`Failed to process visual embedding for scene ${scene.id}: ${error}`)
          return { id: scene.id, embedding: null, metadata: {}, success: false }
        }
      })

      const visualEmbeddingsResults = await Promise.all(visualEmbeddingsPromise)

      const validVisualEmbeddings = visualEmbeddingsResults.filter((r) => r.success && r.embedding)

      if (validVisualEmbeddings.length === 0) {
        logger.warn(`No valid visual embeddings found for batch ${i / VISUAL_BATCH_SIZE + 1}, skipping...`)
        continue
      }

      logger.info(`Storing ${validVisualEmbeddings.length} visual embeddings`)
      await embedVisuals(
        validVisualEmbeddings.map((doc) => ({
          id: doc.id,
          metadata: doc.metadata,
          embedding: doc.embedding!,
        }))
      )

      logger.info(`Batch ${i / VISUAL_BATCH_SIZE + 1}/${Math.ceil(scenes.length / VISUAL_BATCH_SIZE)} complete`)
    }
  } catch (err) {
    logger.error(`Error in embedVisualScenes for ${videoFullPath}: ${err}`)
    throw err
  }
}
