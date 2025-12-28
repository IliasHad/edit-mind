import * as path from 'path'
import dotenv from 'dotenv'

if (process.env.NODE_ENV === 'testing') {
  dotenv.config({ path: path.resolve('../../.env.testing') })
} else {
  dotenv.config({})
}

export const STITCHED_VIDEOS_DIR = process.env.STITCHED_VIDEOS_DIR


export const SUPPORTED_VIDEO_EXTENSIONS = /\.(mp4|mov|avi|mkv)$/i
export const DEFAULT_FPS = 30
export const THUMBNAIL_SCALE = '320:-1'
export const THUMBNAIL_QUALITY = '4'
export const BATCH_THUMBNAIL_QUALITY = '3'

export const MAX_DEPTH = 5

export const THUMBNAILS_DIR = process.env.THUMBNAILS_PATH || '.thumbnails'
