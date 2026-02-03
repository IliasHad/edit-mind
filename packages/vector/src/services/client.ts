import { AUDIO_EMBEDDING_MODEL, TEXT_EMBEDDING_MODEL, VISUAL_EMBEDDING_MODEL } from '@shared/constants/embedding'
import { ChromaClient, type Collection } from 'chromadb'
import { CHROMA_HOST, CHROMA_PORT, COLLECTION_NAME } from '@vector/constants'
import { logger } from '@shared/services/logger'
import { DefaultEmbeddingFunction } from '@chroma-core/default-embed';

let cachedClient: ChromaClient | null = null
let cachedCollection: Collection | null = null
let cachedVisualCollection: Collection | null = null
let cachedAudioCollection: Collection | null = null
let cachedCollectionName: string | null = null

const textEmbedder = new DefaultEmbeddingFunction({
  modelName: TEXT_EMBEDDING_MODEL
});

const audioEmbedder = new DefaultEmbeddingFunction({
  modelName: AUDIO_EMBEDDING_MODEL
});

const visualEmbedder = new DefaultEmbeddingFunction({
  modelName: VISUAL_EMBEDDING_MODEL,
});

export const createVectorDbClient = async (
  collectionName: string = COLLECTION_NAME
): Promise<{
  collection: Collection | null
  client: ChromaClient | null
  visual_collection: Collection | null
  audio_collection: Collection | null
}> => {
  // Return cached instances if they exist and collection name matches
  if (
    cachedClient &&
    cachedCollection &&
    cachedVisualCollection &&
    cachedAudioCollection &&
    cachedCollectionName === collectionName
  ) {
    return {
      client: cachedClient,
      collection: cachedCollection,
      audio_collection: cachedAudioCollection,
      visual_collection: cachedVisualCollection,
    }
  }

  try {
    logger.info(`Initializing ChromaDB client with host: ${CHROMA_HOST}, port: ${CHROMA_PORT}`)
    cachedClient = new ChromaClient({ host: CHROMA_HOST, port: parseInt(CHROMA_PORT) })

    cachedCollection = await cachedClient.getOrCreateCollection({ name: collectionName, embeddingFunction: textEmbedder })

    cachedVisualCollection = await cachedClient.getOrCreateCollection({
      name: `${collectionName}_visual`,
      embeddingFunction: visualEmbedder,
    })

    cachedAudioCollection = await cachedClient.getOrCreateCollection({
      name: `${collectionName}_audio`,
      embeddingFunction: audioEmbedder,
    })

    cachedCollectionName = collectionName

    return {
      client: cachedClient,
      collection: cachedCollection,
      audio_collection: cachedAudioCollection,
      visual_collection: cachedVisualCollection,
    }
  } catch (error) {
    logger.error(`Failed to initialize ChromaDB client: ${error}`)
    cachedClient = null
    cachedCollection = null
    cachedVisualCollection = null
    cachedAudioCollection = null
    cachedCollectionName = null
    throw error
  }
}