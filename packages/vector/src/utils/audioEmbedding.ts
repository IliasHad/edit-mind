import { createVectorDbClient, embedAudios } from '../services/vectorDb'
import { AUDIO_BATCH_SIZE } from '../constants'
import { logger } from '@shared/services/logger'
import { cleanupAudio, extractSceneAudio } from '@media-utils/utils/audio'
import { embedSceneAudio } from '../services/embedding'
import type { Scene } from '@shared/schemas'
import { sceneToVectorFormat } from '../utils/shared'

export const embedAudioScenes = async (scenes: Scene[], videoFullPath: string): Promise<void> => {
  try {
    const { audio_collection } = await createVectorDbClient()

    if (!audio_collection) {
      throw new Error('Audio Collection not initialized')
    }
    const idsToCheck = scenes.map((e) => e.id)
    const existingAudioIds = await audio_collection.get({
      ids: idsToCheck,
      include: [],
    })
    const newScenes = scenes.filter((emb) => !existingAudioIds?.ids.includes(emb.id))

    for (let i = 0; i < newScenes.length; i += AUDIO_BATCH_SIZE) {
      const batch = newScenes.slice(i, i + AUDIO_BATCH_SIZE)

      logger.info(`Processing ${batch.length} scenes for audio embeddings`)

      const audioEmbeddingsPromise = batch.map(async (scene) => {
        try {
          const audioPath = await extractSceneAudio(scene.source, scene.startTime, scene.endTime, {
            format: 'wav',
            sampleRate: 48000,
            channels: 1,
          })

          const embedding = await embedSceneAudio(audioPath)
          await cleanupAudio(audioPath)

          const { metadata, id } = await sceneToVectorFormat(scene)

          return {
            id,
            embedding,
            metadata,
            success: true,
          }
        } catch (error) {
          logger.error(`Failed to process audio embedding for ${scene.id}: ${error}`)
          return { id: scene.id, embedding: null, metadata: {}, success: false }
        }
      })

      const audioEmbeddingsResults = await Promise.all(audioEmbeddingsPromise)

      const validAudioEmbeddings = audioEmbeddingsResults.filter((r) => r.success && r.embedding)

      if (validAudioEmbeddings.length === 0) {
        logger.warn(`No valid Audio embeddings found for batch ${i / AUDIO_BATCH_SIZE + 1}, skipping...`)
        continue
      }

      logger.info(`Storing ${validAudioEmbeddings.length} audio embeddings`)
      await embedAudios(
        validAudioEmbeddings.map((doc) => ({
          id: doc.id,
          metadata: doc.metadata,
          embedding: doc.embedding!,
        }))
      )
      logger.info(
        `Batch ${i / AUDIO_BATCH_SIZE + 1} complete: ` + `${validAudioEmbeddings.length} audio embeddings stored`
      )
    }
  } catch (err) {
    logger.error(`Error in embedScenes for ${videoFullPath}: ${err}`)
    throw err
  }
}
