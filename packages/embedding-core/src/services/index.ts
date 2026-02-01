import type { PreTrainedModel, Processor, PreTrainedTokenizer, FeatureExtractionPipeline } from '@xenova/transformers'
import { logger } from '@shared/services/logger'
import { withTimeout } from '@vector/utils/shared'
import { EMBEDDING_TIMEOUT, MODEL_DIMENSIONS } from '@shared/constants/embedding'

let visualModelCache: { processor: Processor; model: PreTrainedModel } | null = null
let textModelCache: { embed: FeatureExtractionPipeline } | null = null
let audioModelCache: { processor: Processor; model: PreTrainedModel } | null = null
let textToVisualModelCache: { tokenizer: PreTrainedTokenizer; model: PreTrainedModel } | null = null
let textToAudioModelCache: { tokenizer: PreTrainedTokenizer; model: PreTrainedModel } | null = null

export async function geTextExtractor() {
  if (!textModelCache) {
    const { pipeline } = await import('@xenova/transformers')

    const embed = await pipeline('feature-extraction', 'Xenova/all-mpnet-base-v2')

    textModelCache = { embed }
  }
  return textModelCache
}

export async function getFrameExtractor() {
  if (!visualModelCache) {
    const { AutoProcessor, CLIPVisionModelWithProjection } = await import('@xenova/transformers')

    const processor = await AutoProcessor.from_pretrained('Xenova/clip-vit-base-patch32')
    const model = await CLIPVisionModelWithProjection.from_pretrained('Xenova/clip-vit-base-patch32')
    visualModelCache = { processor, model }
  }
  return visualModelCache
}

export async function getAudioExtractor() {
  if (!audioModelCache) {
    const { AutoProcessor, ClapAudioModelWithProjection } = await import('@xenova/transformers')
    const processor = await AutoProcessor.from_pretrained('Xenova/clap-htsat-unfused')
    const model = await ClapAudioModelWithProjection.from_pretrained('Xenova/clap-htsat-unfused')

    audioModelCache = { processor, model }
  }
  return audioModelCache
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const { embed } = await geTextExtractor()

  const vectors = await Promise.all(
    texts.map(async (text) => {
      try {
        const output = await withTimeout(
          embed(text, { pooling: 'mean', normalize: true }),
          EMBEDDING_TIMEOUT,
          `Text embedding timed out after ${EMBEDDING_TIMEOUT}ms`
        )

        const data = output.data
        if (!(data instanceof Float32Array)) {
          throw new Error('Unexpected extractor output')
        }
        return Array.from(data)
      } catch (error) {
        logger.error(`Error embedding text "${text.substring(0, 50)}...": ${error}`)
        // Return zero vector with known dimension - don't call the model again
        return new Array(MODEL_DIMENSIONS.text).fill(0)
      }
    })
  )

  return vectors
}

export async function getEmbeddingDimension(): Promise<number> {
  const { embed } = await geTextExtractor()
  const testOutput = await embed('test', {
    pooling: 'mean',
    normalize: true,
  })
  return (testOutput.data as Float32Array).length
}

async function getTextToVisualExtractor() {
  if (!textToVisualModelCache) {
    const { AutoTokenizer, CLIPTextModelWithProjection } = await import('@xenova/transformers')

    const tokenizer = await AutoTokenizer.from_pretrained('Xenova/clip-vit-base-patch32')
    const model = await CLIPTextModelWithProjection.from_pretrained('Xenova/clip-vit-base-patch32')
    textToVisualModelCache = { tokenizer, model }
  }
  return textToVisualModelCache
}

async function getTextToAudioExtractor() {
  if (!textToAudioModelCache) {
    const { AutoTokenizer, ClapTextModelWithProjection } = await import('@xenova/transformers')

    const tokenizer = await AutoTokenizer.from_pretrained('Xenova/clap-htsat-unfused')
    const model = await ClapTextModelWithProjection.from_pretrained('Xenova/clap-htsat-unfused')
    textToAudioModelCache = { tokenizer, model }
  }
  return textToAudioModelCache
}

export async function getVisualEmbeddingForText(text: string): Promise<number[]> {
  const { tokenizer, model } = await getTextToVisualExtractor()
  const inputs = tokenizer([text])
  const { text_embeds } = await model(inputs)
  const embedding = Array.from(text_embeds.data as Float32Array)
  const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0))
  if (norm === 0) return embedding
  return embedding.map((v) => v / norm)
}

export async function getAudioEmbeddingForText(text: string): Promise<number[]> {
  const { tokenizer, model } = await getTextToAudioExtractor()
  const inputs = tokenizer([text])
  const { text_embeds } = await model(inputs)
  const embedding = Array.from(text_embeds.data as Float32Array)
  const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0))
  if (norm === 0) return embedding
  return embedding.map((v) => v / norm)
}

export async function getImageEmbedding(imageBuffer: Buffer): Promise<number[]> {
  const { processor, model } = await getFrameExtractor()
  const { RawImage } = await import('@xenova/transformers')

  const image = await RawImage.fromBlob(new Blob([new Uint8Array(imageBuffer)]))
  const inputs = await processor(image)
  const { image_embeds } = await model(inputs)

  const embedding = Array.from(image_embeds.data as Float32Array)
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
  return embedding.map((val) => val / norm)
}
