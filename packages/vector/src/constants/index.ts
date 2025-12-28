import * as path from 'path'
import dotenv from 'dotenv'

if (process.env.NODE_ENV === 'testing') {
  dotenv.config({ path: path.resolve('../../.env.testing') })
} else {
  dotenv.config({})
}



// Service settings
export const EMBEDDING_BATCH_SIZE = 200
export const VISUAL_BATCH_SIZE = 10
export const AUDIO_BATCH_SIZE = 10

// ChromaDB
export const CHROMA_HOST = process.env.CHROMA_HOST || 'localhost'
export const CHROMA_PORT = process.env.CHROMA_PORT || '8000'
export const COLLECTION_NAME = 'video_content'


export const IS_TESTING = process.env.NODE_ENV === 'testing'

export const THUMBNAILS_DIR = process.env.THUMBNAILS_PATH || '.thumbnails'
