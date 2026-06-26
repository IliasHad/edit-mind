import { createVectorDbClient } from '@vector/services/client'

import { AUDIO_BATCH_SIZE } from '@shared/constants/embedding'
import { logger } from '@shared/services/logger'
import { cleanupAudio, extractSceneAudio, hasAudioStream } from '@media-utils/utils/audio'
import { embedSceneAudio } from '../services'
import type { Scene } from '@shared/types'
import { sceneToVectorFormat } from '@vector/utils/shared'
import { embedAudios } from '@embedding-media/services/embed'

export const embedAudioScenes = async (
  scenes: Scene[],
  videoFullPath: string,
  onProgress?: (batchIndex: number, totalBatches: number) => Promise<void>
): Promise<void> => {
  try {
    const { audio_collection } = await createVectorDbClient()

    if (!audio_collection) {
      throw new Error('Audio Collection not initialized')
    }

    const hasAudio = await hasAudioStream(videoFullPath)

    if (!hasAudio) {
      logger.warn(`Skipped audio embedding for "${videoFullPath}" because no audio track was found.`)
      return
    }

    const totalBatches = Math.ceil(scenes.length / AUDIO_BATCH_SIZE)
    for (let i = 0; i < scenes.length; i += AUDIO_BATCH_SIZE) {
      const batch = scenes.slice(i, i + AUDIO_BATCH_SIZE)
      const batchNumber = i / AUDIO_BATCH_SIZE + 1

      logger.info(`Processing ${batch.length} scenes for audio embeddings`)

      // Step 1: extract audio for all scenes concurrently (I/O-bound ffmpeg)
      const extractionStart = Date.now()
      const audioPaths = await Promise.all(
        batch.map(async (scene) => {
          try {
            return await extractSceneAudio(scene.source, scene.startTime, scene.endTime, {
              format: 'wav',
              sampleRate: 48000,
              channels: 1,
            })
          } catch (error) {
            logger.error(`Failed to extract audio for scene ${scene.id}: ${error}`)
            return undefined
          }
        })
      )
      logger.info(`Audio extracted in ${(Date.now() - extractionStart) / 1000}s`)

      // Step 2: embed sequentially — prevents competing GPU kernel launches
      const audioEmbeddingsResults = []
      for (let j = 0; j < batch.length; j++) {
        const scene = batch[j]
        const audioPath = audioPaths[j]
        try {
          if (!audioPath) throw new Error('No audio extracted')
          const embedding = await embedSceneAudio(audioPath)
          await cleanupAudio(audioPath)
          const { metadata, id } = await sceneToVectorFormat(scene)
          audioEmbeddingsResults.push({ id, embedding, metadata, success: true })
        } catch (error) {
          logger.error(`Failed to process audio embedding for ${scene.id}: ${error}`)
          if (audioPaths[j]) await cleanupAudio(audioPaths[j]!).catch(() => {})
          audioEmbeddingsResults.push({ id: scene.id, embedding: null, metadata: {}, success: false })
        }
      }

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
      logger.info(`Batch ${batchNumber}/${totalBatches} complete: ${validAudioEmbeddings.length} audio embeddings stored`)

      if (onProgress) {
        await onProgress(batchNumber, totalBatches)
      }
    }
  } catch (err) {
    logger.error(`Error in embedScenes for ${videoFullPath}: ${err}`)
    throw err
  }
}
