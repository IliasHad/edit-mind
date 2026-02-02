import 'dotenv/config'

// Directories
export const THUMBNAILS_DIR = process.env.THUMBNAILS_PATH || '.thumbnails'
export const FACES_DIR = process.env.FACES_DIR || '.faces'
export const PROCESSED_VIDEOS_DIR = process.env.PROCESSED_VIDEOS_DIR || '.results'
export const UNKNOWN_FACES_DIR = process.env.UNKNOWN_FACES_DIR || '.unknown_faces'

export const CACHE_FILE = '.locations.json'

export const SUPPORTED_VIDEO_EXTENSIONS = /\.(mp4|mov|avi|mkv)$/i

// Redis Cache
export const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
export const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000 // 30 days
export const REDIS_HOST = process.env.REDIS_HOST || 'localhost'
export const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379')

export const MEDIA_BASE_PATH = '/media/videos'

export const HOST_MEDIA_PATH = process.env.HOST_MEDIA_PATH

export const STITCHED_VIDEOS_DIR = process.env.STITCHED_VIDEOS_DIR

export const ML_PORT = process.env.ML_PORT || '8765'
export const ML_HOST = process.env.ML_HOST || 'ml'

export const IS_TESTING = process.env.NODE_ENV === 'testing'

export const MAX_MESSAGES_PER_CHAT = 10

export const USE_EXTERNAL_ML_SERVICE = process.env.USE_EXTERNAL_ML_SERVICE === 'true'