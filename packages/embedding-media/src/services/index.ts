import { logger } from '@shared/services/logger'
import { existsSync, readFileSync } from 'fs'
import { readAudio } from '@media-utils/utils/audio'
import { withTimeout } from '@vector/utils/shared'
import { EMBEDDING_TIMEOUT } from '@shared/constants/embedding'
import { getFrameExtractor, getAudioExtractor } from '@embedding-core/services/extractors'

export async function embedSceneFrames(frames: string[]): Promise<number[] | null> {
  const { processor, model } = await getFrameExtractor()
  const { RawImage } = await import('@xenova/transformers')
  const frameEmbeddings: number[][] = []

  for (const frame of frames) {
    try {
      if (!existsSync(frame)) {
        throw new Error(`Image file not found: ${frame}`)
      }
      const buffer = readFileSync(frame)
      const image = await RawImage.fromBlob(new Blob([buffer]))

      const image_inputs = await processor(image)
      const { image_embeds } = await withTimeout<{ image_embeds: { data: Float32Array } }>(
        model(image_inputs),
        EMBEDDING_TIMEOUT,
        `Visual embedding timed out after ${EMBEDDING_TIMEOUT}ms`
      )

      const vec = Array.from(image_embeds.data)
      const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0))
      frameEmbeddings.push(vec.map((v) => v / norm))
    } catch (e) {
      logger.debug(`Error getting visual embedding for ${frame}: ${e}`)
    }
  }

  if (!frameEmbeddings.length) return null

  const meanVec = frameEmbeddings[0].map(
    (_, i) => frameEmbeddings.reduce((sum, v) => sum + v[i], 0) / frameEmbeddings.length
  )

  const norm = Math.sqrt(meanVec.reduce((s, v) => s + v * v, 0))
  return meanVec.map((v) => v / norm)
}

export async function embedSceneAudio(audioPath: string): Promise<number[]> {
  const { processor, model } = await getAudioExtractor()

  if (!existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`)
  }

  try {
    const audio = await readAudio(audioPath, 48000)
    const audio_inputs = await processor(audio)

    const { audio_embeds } = await withTimeout<{ audio_embeds: { data: number[] } }>(
      model(audio_inputs),
      EMBEDDING_TIMEOUT,
      `Audio embedding timed out after ${EMBEDDING_TIMEOUT}ms`
    )

    const embedding = Array.from(audio_embeds.data)
    const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0))
    return embedding.map((v) => v / norm)
  } catch (error) {
    logger.error(`Error processing audio file ${audioPath}: ${error}`)
    throw error
  }
}
