import type { FeatureExtractionPipeline, PreTrainedModel, Processor } from '@xenova/transformers'
import { logger } from '@shared/services/logger'
import { existsSync, readFileSync } from 'fs'
import { readAudio } from '@media-utils/utils/audio'

let extractor: FeatureExtractionPipeline | null = null
let audioInitPromise: Promise<{
  model: PreTrainedModel
  processor: Processor
}> | null = null

let visualModelCache: { processor: Processor; model: PreTrainedModel } | null = null

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  const { pipeline } = await import('@xenova/transformers')

  if (!extractor) {
    extractor = await pipeline('feature-extraction', 'Xenova/all-mpnet-base-v2')
  }
  return extractor
}

async function getFrameExtractor() {
  if (!visualModelCache) {
    const { AutoProcessor, CLIPVisionModelWithProjection } = await import('@xenova/transformers')

    const processor = await AutoProcessor.from_pretrained('Xenova/clip-vit-base-patch32')
    const model = await CLIPVisionModelWithProjection.from_pretrained('Xenova/clip-vit-base-patch32')
    visualModelCache = { processor, model }
  }
  return visualModelCache
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const extractor = await getExtractor()
  const vectors: number[][] = []

  for (const text of texts) {
    const output = await extractor(text, {
      pooling: 'mean',
      normalize: true,
    })
    vectors.push(Array.from(output.data as Float32Array))
  }

  return vectors
}

export async function getEmbeddingDimension(): Promise<number> {
  const extractor = await getExtractor()
  const testOutput = await extractor('test', {
    pooling: 'mean',
    normalize: true,
  })
  return (testOutput.data as Float32Array).length
}

let textToVisualModelCache: { processor: any; model: any } | null = null
let textToAudioModelCache: { processor: any; model: any } | null = null

async function getTextToVisualExtractor() {
  if (!textToVisualModelCache) {
    const { AutoTokenizer, CLIPTextModelWithProjection } = await import('@xenova/transformers')

    const processor = await AutoTokenizer.from_pretrained('Xenova/clip-vit-base-patch32')
    const model = await CLIPTextModelWithProjection.from_pretrained('Xenova/clip-vit-base-patch32')
    textToVisualModelCache = { processor, model }
  }
  return textToVisualModelCache
}

async function getTextToAudioExtractor() {
  if (!textToAudioModelCache) {
    const { AutoTokenizer, ClapTextModelWithProjection } = await import('@xenova/transformers')

    const processor = await AutoTokenizer.from_pretrained('Xenova/clap-htsat-unfused')
    const model = await ClapTextModelWithProjection.from_pretrained('Xenova/clap-htsat-unfused')
    textToAudioModelCache = { processor, model }
  }
  return textToAudioModelCache
}

export async function getVisualEmbeddingForText(text: string): Promise<number[]> {
  const { processor, model } = await getTextToVisualExtractor()
  const inputs = processor([text])
  const { text_embeds } = await model(inputs)
  const embedding = Array.from(text_embeds.data as Float32Array)
  const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0))
  if (norm === 0) return embedding
  return embedding.map((v) => v / norm)
}

export async function getAudioEmbeddingForText(text: string): Promise<number[]> {
  const { processor, model } = await getTextToAudioExtractor()
  const inputs = processor([text])
  const { text_embeds } = await model(inputs)
  const embedding = Array.from(text_embeds.data as Float32Array)
  const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0))
  if (norm === 0) return embedding
  return embedding.map((v) => v / norm)
}

export async function getImageEmbedding(imageBuffer: Buffer): Promise<number[]> {
  const { processor, model  } = await getFrameExtractor()
  const { RawImage } = await import('@xenova/transformers')
  
  const image = await RawImage.fromBlob(new Blob([new Uint8Array(imageBuffer)]))
  const inputs = await processor(image)
  const { image_embeds } = await model(inputs)
  
  const embedding = Array.from(image_embeds.data as Float32Array)
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
  return embedding.map(val => val / norm)
}

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
      const { image_embeds } = await model(image_inputs)

      const vec = Array.from(image_embeds.data as Float32Array)
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

async function getAudioExtractor() {
  if (!audioInitPromise) {
    audioInitPromise = (async () => {
      const { AutoProcessor, ClapAudioModelWithProjection } = await import('@xenova/transformers')
      const processor = await AutoProcessor.from_pretrained('Xenova/clap-htsat-unfused')
      const model = await ClapAudioModelWithProjection.from_pretrained('Xenova/clap-htsat-unfused')

      return { model, processor }
    })()
  }

  return audioInitPromise
}

export async function embedSceneAudio(audioPath: string): Promise<number[]> {
  const { processor, model } = await getAudioExtractor()

  if (!existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`)
  }

  try {
    const audio = await readAudio(audioPath, 48000)
    const audio_inputs = await processor(audio)
    const { audio_embeds } = await model(audio_inputs)

    const embedding = Array.from(audio_embeds.data) as number[]
    const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0))
    return embedding.map((v) => v / norm)
  } catch (error) {
    logger.error(`Error processing audio file ${audioPath}: ${error}`)
    throw error
  }
}
