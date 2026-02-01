import { ChromaClient, Collection } from 'chromadb';
import { CHROMA_HOST, CHROMA_PORT, COLLECTION_NAME } from '@vector/constants'
import { logger } from '@shared/services/logger'

let cachedClient: ChromaClient | null = null
let cachedCollection: Collection | null = null
let cachedVisualCollection: Collection | null = null
let cachedAudioCollection: Collection | null = null
let cachedCollectionName: string | null = null

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

    cachedCollection = await cachedClient.getOrCreateCollection({ name: collectionName })

    cachedVisualCollection = await cachedClient.getOrCreateCollection({
      name: `${collectionName}_visual`,
    })

    cachedAudioCollection = await cachedClient.getOrCreateCollection({
      name: `${collectionName}_audio`,
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