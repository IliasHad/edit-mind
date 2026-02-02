import { logger } from '@shared/services/logger'
import { createVectorDbClient } from '@vector/services/client'
import { EmbeddingAudioInput, EmbeddingVisualInput } from '@vector/types/vector'
import { sanitizeMetadata } from '@vector/utils/shared'

export async function embedVisuals(documents: EmbeddingVisualInput[]): Promise<void> {
  try {
    const validDocuments = documents.filter(
      (d) => d.id && d.embedding && Array.isArray(d.embedding) && d.embedding.length > 0 && d.metadata
    )

    if (validDocuments.length === 0) {
      logger.warn('No valid visual embeddings to store. Check for missing IDs or empty embeddings.')
      return
    }

    const { visual_collection } = await createVectorDbClient()
    if (!visual_collection) {
      throw new Error('Visual collection not initialized')
    }

    const sanitizedDocuments = validDocuments.map((doc) => ({
      ...doc,
      metadata: sanitizeMetadata(doc.metadata || {}),
    }))

    const ids = sanitizedDocuments.map((d) => d.id)
    const metadatas = sanitizedDocuments.map((d) => d.metadata || {})
    const embeddings = sanitizedDocuments.map((d) => d.embedding)

    const dimensions = new Set(embeddings.map((e) => e.length))
    if (dimensions.size > 1) {
      throw new Error(
        `Inconsistent visual embedding dimensions: ${Array.from(dimensions).join(', ')}. Expected 512 (CLIP).`
      )
    }

    const expectedDimension = 512
    if (embeddings[0].length !== expectedDimension) {
      throw new Error(`Visual embedding dimension mismatch: got ${embeddings[0].length}, expected ${expectedDimension}`)
    }

    for (let i = 0; i < embeddings.length; i++) {
      const hasInvalidValues = embeddings[i].some((val) => !isFinite(val) || isNaN(val))
      if (hasInvalidValues) {
        throw new Error(`Visual embedding at index ${i} contains invalid values (NaN or Infinity)`)
      }
    }

    await visual_collection.add({
      ids,
      metadatas,
      embeddings,
    })
  } catch (error) {
    logger.error('Error embedding visual documents')
    throw error
  }
}

export async function embedAudios(documents: EmbeddingAudioInput[]): Promise<void> {
  try {
    const validDocuments = documents.filter(
      (d) => d.id && d.embedding && Array.isArray(d.embedding) && d.embedding.length > 0 && d.metadata
    )

    if (validDocuments.length === 0) {
      logger.warn('No valid audio embeddings to store')
      return
    }

    const { audio_collection } = await createVectorDbClient()
    if (!audio_collection) {
      throw new Error('Audio collection not initialized')
    }

    const sanitizedDocuments = validDocuments.map((doc) => ({
      ...doc,
      metadata: sanitizeMetadata(doc.metadata || {}),
    }))

    const ids = sanitizedDocuments.map((d) => d.id)
    const metadatas = sanitizedDocuments.map((d) => d.metadata || {})
    const embeddings = sanitizedDocuments.map((d) => d.embedding)

    const dimensions = new Set(embeddings.map((e) => e.length))
    if (dimensions.size > 1) {
      throw new Error(
        `Inconsistent audio embedding dimensions: ${Array.from(dimensions).join(', ')}. Expected 512 (CLAP).`
      )
    }

    const expectedDimension = 512
    if (embeddings[0].length !== expectedDimension) {
      throw new Error(`Audio embedding dimension mismatch: got ${embeddings[0].length}, expected ${expectedDimension}`)
    }

    for (let i = 0; i < embeddings.length; i++) {
      const hasInvalidValues = embeddings[i].some((val) => !isFinite(val) || isNaN(val))
      if (hasInvalidValues) {
        throw new Error(`Audio embedding at index ${i} contains invalid values (NaN or Infinity)`)
      }
    }

    await audio_collection.add({
      ids,
      metadatas,
      embeddings,
    })
  } catch (error) {
    logger.error('Error embedding audio documents')
    throw error
  }
}
