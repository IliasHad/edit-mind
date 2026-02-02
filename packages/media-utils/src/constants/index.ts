import { checkFFmpegGPUSupport, isGPUAvailable } from '@media-utils/lib/gpu'
import 'dotenv/config'

export const STITCHED_VIDEOS_DIR = process.env.STITCHED_VIDEOS_DIR

export const DEFAULT_FPS = 30
export const THUMBNAIL_SCALE = '320:-1'
export const THUMBNAIL_QUALITY = '4'
export const BATCH_THUMBNAIL_QUALITY = '3'

export const MAX_DEPTH = 1

export const THUMBNAILS_DIR = process.env.THUMBNAILS_PATH || '.thumbnails'

export const EXPORTS_DIR = process.env.EXPORTS_DIR || '/app/data/.exports'

export const USE_GPU = isGPUAvailable() && checkFFmpegGPUSupport()
