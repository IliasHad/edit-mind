import { Scene } from '@shared/types/scene'
import { createVectorDbClient } from '@vector/services/client'

import { EMBEDDING_BATCH_SIZE } from '@shared/constants/embedding'
import { logger } from '@shared/services/logger'
import { DEFAULT_LANGUAGE, type AppLanguage } from '@shared/types/language'
import { sceneToVectorFormat } from '@vector/utils/shared'
import { getEmbeddings } from '@embedding-core/services/extractors'
import { embedTextDocuments, updateTextDocuments } from '@embedding-core/services/embed';

export const embedScenes = async (
  scenes: Scene[],
  videoFullPath: string,
  language: AppLanguage = DEFAULT_LANGUAGE,
  onProgress?: (batchIndex: number, totalBatches: number) => Promise<void>
): Promise<void> => {
  try {
    const totalBatches = Math.ceil(scenes.length / EMBEDDING_BATCH_SIZE)
    for (let i = 0; i < scenes.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = scenes.slice(i, i + EMBEDDING_BATCH_SIZE)

      const embeddingInputsPromise = batch.map(async (scene) => {
        return await sceneToVectorFormat(scene, language)
      })
      const embeddingInputs = await Promise.all(embeddingInputsPromise)

      const { collection } = await createVectorDbClient()

      if (!collection) {
        throw new Error('Collection not initialized')
      }

      if (embeddingInputs.length > 0) {
        logger.info(`Embedding ${embeddingInputs.length} new text documents`)
        const embedding = await getEmbeddings(embeddingInputs.map((doc) => doc.text))
        await embedTextDocuments(
          embeddingInputs.map((doc) => ({
            id: doc.id,
            metadata: doc.metadata,
            text: doc.text,
          })),
          embedding
        )
      }

      const batchNumber = i / EMBEDDING_BATCH_SIZE + 1
      logger.info(`Batch ${batchNumber}/${totalBatches} complete: ${embeddingInputs.length} text`)

      if (onProgress) {
        await onProgress(batchNumber, totalBatches)
      }
    }
  } catch (err) {
    logger.error(`Error in embedScenes for ${videoFullPath}: ${err}`)
    throw err
  }
}

export const updateScenes = async (
  scenes: Scene[],
  videoFullPath: string,
  language: AppLanguage = DEFAULT_LANGUAGE
): Promise<void> => {
  try {
    for (let i = 0; i < scenes.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = scenes.slice(i, i + EMBEDDING_BATCH_SIZE)

      const embeddingInputsPromise = batch.map(async (scene) => {
        return await sceneToVectorFormat(scene, language)
      })
      const embeddingInputs = await Promise.all(embeddingInputsPromise)

      const { collection } = await createVectorDbClient()

      if (!collection) {
        throw new Error('Collection not initialized')
      }

      if (embeddingInputs.length > 0) {
        logger.info(`Embedding ${embeddingInputs.length} new text documents`)
        const embedding = await getEmbeddings(embeddingInputs.map((doc) => doc.text))
        await updateTextDocuments(
          embeddingInputs.map((doc) => ({
            id: doc.id,
            metadata: doc.metadata,
            text: doc.text,
          })),
          embedding
        )
      }

      logger.info(`Batch ${i / EMBEDDING_BATCH_SIZE + 1}/${Math.ceil(scenes.length / EMBEDDING_BATCH_SIZE)} complete: ` + `${embeddingInputs.length} text`)
    }
  } catch (err) {
    logger.error(`Error in embedScenes for ${videoFullPath}: ${err}`)
    throw err
  }
}