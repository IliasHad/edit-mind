import * as path from 'path'
import dotenv from 'dotenv'

if (process.env.NODE_ENV === 'testing') {
  dotenv.config({ path: path.resolve('../../.env.testing') })
} else {
  dotenv.config({})
}

// General
export const IS_WIN = process.platform === 'win32'

// Directories
export const THUMBNAILS_DIR = process.env.THUMBNAILS_PATH || '.thumbnails'
export const FACES_DIR = process.env.FACES_DIR || '.faces_db'
export const PROCESSED_VIDEOS_DIR = process.env.PROCESSED_VIDEOS_DIR || path.resolve('.results')
export const DATA_DIR = path.resolve('data')
export const UNKNOWN_FACES_DIR = process.env.UNKNOWN_FACES_DIR || '.unknown_faces'
export const BACKGROUND_JOBS_DIR = process.env.BACKGROUND_JOBS_DIR || '/apps/background-jobs'

export const CACHE_FILE = '.locations.json'

// Timeouts and Intervals
export const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
export const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000 // 30 days
export const SERVICE_STARTUP_TIMEOUT = 60000 // 60 seconds
export const HEALTH_CHECK_INTERVAL = 1000 // 1 second

// Service settings
export const MAX_RESTARTS = 10
export const RESTART_BACKOFF_MS = 1000
export const EMBEDDING_BATCH_SIZE = 200
export const MAX_DEPTH = 5

// ChromaDB
export const CHROMA_HOST = process.env.CHROMA_HOST || 'localhost'
export const CHROMA_PORT = process.env.CHROMA_PORT || '8000'
export const COLLECTION_NAME = 'video_content'

// AI Models
export const EMBEDDING_MODEL = 'text-embedding-004'
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
export const SEARCH_AI_MODEL = process.env.SEARCH_AI_MODEL
export const USE_LOCAL = process.env.USE_LOCAL_MODEL === 'true'
export const GEMINI_MODEL_NAME = 'gemini-2.5-pro'
// Files
export const SUPPORTED_VIDEO_EXTENSIONS = /\.(mp4|mov|avi|mkv)$/i
export const DEFAULT_FPS = 30
export const THUMBNAIL_SCALE = '320:-1'
export const THUMBNAIL_QUALITY = '4'
export const BATCH_THUMBNAIL_QUALITY = '3'

export const PYTHON_SCRIPT = path.resolve(process.env.PYTHON_SCRIPT || './python')
export const VENV_PATH = path.resolve(process.env.VENV_PATH || './venv')

export const MEDIA_BASE_PATH = '/media/videos'

export const STITCHED_VIDEOS_DIR = process.env.STITCHED_VIDEOS_DIR

export const PYTHON_PORT = process.env.PYTHON_PORT || '8765'

export const IS_TESTING = process.env.NODE_ENV === 'testing'

export const MAX_MESSAGES_PER_CHAT = 50
