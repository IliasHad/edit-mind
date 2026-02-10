import fs from 'fs'
import { THUMBNAIL_QUALITY, THUMBNAIL_SCALE, THUMBNAILS_DIR } from '../constants'
import { handleFFmpegProcess, spawnFFmpeg } from '../lib/ffmpeg'
import { validateFile } from '@shared/utils/file'
import { getGPUDecodeArgs } from '@media-utils/lib/ffmpegGpu'

const initializeThumbnailsDir = (): void => {
  if (!fs.existsSync(THUMBNAILS_DIR)) {
    fs.mkdirSync(THUMBNAILS_DIR, { recursive: true })
  }
}

initializeThumbnailsDir()

export async function generateThumbnail(
  videoPath: string,
  thumbnailPath: string,
  timestamp: number,
  options?: {
    quality?: string
    scale?: string
  }
): Promise<void> {
  await validateFile(videoPath)

  const quality = options?.quality ?? THUMBNAIL_QUALITY
  const scale = options?.scale ?? THUMBNAIL_SCALE

  let args = [
    ...getGPUDecodeArgs(),
    '-ss',
    timestamp.toString(),
    '-i',
    videoPath,
    '-vframes',
    '1',
    '-vf',
    `scale=${scale}`,
    '-q:v',
    quality,
    thumbnailPath,
    '-y',
    '-loglevel',
    'error',
  ]

  const ffmpegProcess = await spawnFFmpeg(args)
  return handleFFmpegProcess(ffmpegProcess, 'thumbnail generation')
}

export async function generateVideoCover(
  videoPath: string,
  thumbnailPath: string,
  options?: {
    keyframe?: number
    quality?: string
    scale?: string
  }
): Promise<void> {
  await validateFile(videoPath)

  const quality = options?.quality ?? THUMBNAIL_QUALITY
  const scale = options?.scale ?? THUMBNAIL_SCALE
  const keyframe = options?.keyframe ?? 0

  let args = [
    '-skip_frame',
    'nokey',
    '-i',
    videoPath,
    '-vf',
    `select='eq(pict_type\\,I)*eq(n\\,${keyframe})',scale=${scale}`,
    '-vframes',
    '1',
    '-q:v',
    quality,
    thumbnailPath,
    '-y',
    '-loglevel',
    'error',
  ]

  const ffmpegProcess = await spawnFFmpeg(args)
  return handleFFmpegProcess(ffmpegProcess, 'thumbnail generation')
}