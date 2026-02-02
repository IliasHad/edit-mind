import { logger } from '@shared/services/logger'
import { createVectorDbClient } from '@vector/services/client'
import { EmbeddingInput } from '@vector/types/vector'
import { sanitizeMetadata } from '@vector/utils/shared'

export async function embedTextDocuments(documents: EmbeddingInput[], embeddings: number[][]): Promise<void> {
  try {
    const validDocuments = documents.filter((d) => d.text && d.text.trim().length > 0 && d.id && d.metadata)

    if (validDocuments.length === 0) {
      logger.warn('No valid documents to embed after validation')
      return
    }

    const { collection } = await createVectorDbClient()
    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const sanitizedDocuments = validDocuments.map((doc) => ({
      ...doc,
      metadata: doc.metadata ? sanitizeMetadata(doc.metadata) : {},
    }))

    const ids = sanitizedDocuments.map((d) => d.id)
    const metadatas = sanitizedDocuments.map((d) => d.metadata || {})
    const documentTexts = sanitizedDocuments.map((d) => d.text)

    if (!embeddings || embeddings.length !== documentTexts.length) {
      throw new Error('Embedding count mismatch')
    }

    const dimensions = new Set(embeddings.map((e) => e.length))
    if (dimensions.size > 1) {
      throw new Error(`Inconsistent embedding dimensions: ${Array.from(dimensions).join(', ')}`)
    }

    await collection.add({
      ids,
      metadatas,
      documents: documentTexts,
      embeddings,
    })
  } catch (error) {
    logger.error('Error embedding documents:' + error)
    throw error
  }
}
