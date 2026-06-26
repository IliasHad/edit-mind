import { createVectorDbClient } from '@vector/services/client'
import { VISUAL_BATCH_SIZE } from '@shared/constants/embedding'
import { logger } from '@shared/services/logger'
import { cleanupFrames, extractSceneFrames } from '@media-utils/utils/frame'
import { embedSceneFrames } from '../services'
import type { Scene } from '@shared/types'
import { sceneToVectorFormat } from '@vector/utils/shared'
import { embedVisuals } from '@embedding-media/services/embed'

export const embedVisualScenes = async (
  scenes: Scene[],
  videoFullPath: string,
  onProgress?: (batchIndex: number, totalBatches: number) => Promise<void>
): Promise<void> => {
  try {
    const { visual_collection } = await createVectorDbClient()
    if (!visual_collection) {
      throw new Error('Visual Collection not initialized')
    }

    const totalBatches = Math.ceil(scenes.length / VISUAL_BATCH_SIZE)
    for (let i = 0; i < scenes.length; i += VISUAL_BATCH_SIZE) {
      const batch = scenes.slice(i, i + VISUAL_BATCH_SIZE)
      const batchNumber = i / VISUAL_BATCH_SIZE + 1
      logger.info(`Processing batch ${batchNumber}, scenes ${i} to ${i + batch.length - 1}`)

      // Step 1: extract frames for all scenes concurrently (I/O-bound ffmpeg)
      const extractionStart = Date.now()
      const keyframesBatch = await Promise.all(
        batch.map(async (scene) => {
          try {
            return await extractSceneFrames(scene.source, scene.startTime, scene.endTime, {
              framesPerScene: 2,
              format: 'jpg',
              quality: 2,
              maxWidth: 640,
            })
          } catch (error) {
            logger.error(`Failed to extract frames for scene ${scene.id}: ${error}`)
            return []
          }
        })
      )
      logger.info(`Frames extracted in ${(Date.now() - extractionStart) / 1000}s`)

      // Step 2: embed sequentially — prevents competing GPU kernel launches across scenes
      const visualEmbeddingsResults = []
      for (let j = 0; j < batch.length; j++) {
        const scene = batch[j]
        const keyframes = keyframesBatch[j]
        try {
          const { metadata, id } = await sceneToVectorFormat(scene)
          const embedding = keyframes.length > 0 ? await embedSceneFrames(keyframes) : null
          await cleanupFrames(keyframes)
          visualEmbeddingsResults.push({ id, embedding, metadata, success: true })
        } catch (error) {
          logger.error(`Failed to process visual embedding for scene ${scene.id}: ${error}`)
          await cleanupFrames(keyframesBatch[j]).catch(() => {})
          visualEmbeddingsResults.push({ id: scene.id, embedding: null, metadata: {}, success: false })
        }
      }

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

      logger.info(`Batch ${batchNumber}/${totalBatches} complete`)

      if (onProgress) {
        await onProgress(batchNumber, totalBatches)
      }
    }
  } catch (err) {
    logger.error(`Error in embedVisualScenes for ${videoFullPath}: ${err}`)
    throw err
  }
}
