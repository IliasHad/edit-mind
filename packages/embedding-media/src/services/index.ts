import { logger } from '@shared/services/logger'
import { existsSync, readFileSync } from 'fs'
import { readAudio } from '@media-utils/utils/audio'
import { withTimeout } from '@vector/utils/shared'
import { EMBEDDING_TIMEOUT } from '@shared/constants/embedding'
import { getFrameExtractor, getAudioExtractor } from '@embedding-core/services/extractors'
import { RawImage } from '@huggingface/transformers'

export async function embedSceneFrames(frames: string[]): Promise<number[] | null> {
  const { processor, model } = await getFrameExtractor()

  // Load all valid images in parallel, skip failures
  const images = (
    await Promise.all(
      frames.map(async (frame) => {
        try {
          if (!existsSync(frame)) return null
          const buffer = readFileSync(frame)
          return await RawImage.fromBlob(new Blob([buffer]))
        } catch (e) {
          logger.debug(`Error loading frame ${frame}: ${e}`)
          return null
        }
      })
    )
  ).filter((img): img is RawImage => img !== null)

  if (images.length === 0) return null

  try {
    // Single batched forward pass for all frames — avoids per-frame GPU kernel launches
    const image_inputs = await processor(images)
    const { image_embeds } = await withTimeout<{ image_embeds: { data: Float32Array; dims: number[] } }>(
      model(image_inputs),
      EMBEDDING_TIMEOUT,
      `Visual embedding timed out after ${EMBEDDING_TIMEOUT}ms`
    )

    const embedDim = image_embeds.dims[image_embeds.dims.length - 1]
    const frameEmbeddings: number[][] = []

    for (let i = 0; i < images.length; i++) {
      const vec = Array.from(image_embeds.data.slice(i * embedDim, (i + 1) * embedDim))
      const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0))
      if (norm > 0) frameEmbeddings.push(vec.map((v) => v / norm))
    }

    if (frameEmbeddings.length === 0) return null

    const meanVec = frameEmbeddings[0].map(
      (_, i) => frameEmbeddings.reduce((sum, v) => sum + v[i], 0) / frameEmbeddings.length
    )
    const norm = Math.sqrt(meanVec.reduce((s, v) => s + v * v, 0))
    return norm > 0 ? meanVec.map((v) => v / norm) : null
  } catch (e) {
    logger.debug(`Error getting visual embedding for frames batch: ${e}`)
    return null
  }
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
