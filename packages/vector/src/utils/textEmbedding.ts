import { Scene } from '@shared/types/scene'
import { createVectorDbClient, embedDocuments } from '../services/vectorDb'

import { EMBEDDING_BATCH_SIZE } from '../constants'
import { logger } from '@shared/services/logger'
import { sceneToVectorFormat } from './shared'

export const embedScenes = async (scenes: Scene[], videoFullPath: string): Promise<void> => {
  try {
    for (let i = 0; i < scenes.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = scenes.slice(i, i + EMBEDDING_BATCH_SIZE)

      const embeddingInputsPromise = batch.map(async (scene) => {
        return await sceneToVectorFormat(scene)
      })
      const embeddingInputs = await Promise.all(embeddingInputsPromise)

      const { collection } = await createVectorDbClient()

      if (!collection) {
        throw new Error('Collection not initialized')
      }

      if (embeddingInputs.length > 0) {
        logger.info(`Embedding ${embeddingInputs.length} new text documents`)
        await embedDocuments(
          embeddingInputs.map((doc) => ({
            id: doc.id,
            metadata: doc.metadata,
            text: doc.text,
          }))
        )
      }

      logger.info(`Batch ${i / EMBEDDING_BATCH_SIZE + 1} complete: ` + `${embeddingInputs.length} text`)
    }
  } catch (err) {
    logger.error(`Error in embedScenes for ${videoFullPath}: ${err}`)
    throw err
  }
}
