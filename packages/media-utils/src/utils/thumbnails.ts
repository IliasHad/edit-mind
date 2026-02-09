import fs from 'fs'
import { dirname, join } from 'path'
import { tmpdir } from 'os'
import { THUMBNAIL_QUALITY, THUMBNAIL_SCALE, THUMBNAILS_DIR } from '../constants'
import { handleFFmpegProcess, spawnFFmpeg } from '../lib/ffmpeg'
import { validateFile } from '@shared/utils/file'
import { logger } from '@shared/services/logger'
import { getGPUDecodeArgs } from '@media-utils/lib/ffmpegGpu'
import { BatchThumbnailOptions, ThumbnailRequest } from '@media-utils/types/thumbnail'
import { randomBytes } from 'crypto'

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

export async function generateBatchThumbnails(
  videoPath: string,
  requests: ThumbnailRequest[],
  options?: BatchThumbnailOptions
): Promise<void> {
  await validateFile(videoPath)

  if (requests.length === 0) {
    logger.warn('No thumbnail requests provided')
    return
  }

  const startTime = Date.now()
  const quality = options?.quality ?? THUMBNAIL_QUALITY
  const scale = options?.scale ?? THUMBNAIL_SCALE

  // Sort by timestamp
  const sortedRequests = [...requests].sort((a, b) => a.startTime - b.startTime)

  const outputDirs = new Set(sortedRequests.map((req) => dirname(req.outputPath)))
  for (const dir of outputDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  // Create temporary directory for frame extraction
  const sessionId = randomBytes(8).toString('hex')
  const tempDir = join(tmpdir(), 'edit-mind-thumbnails', sessionId)
  fs.mkdirSync(tempDir, { recursive: true })

  try {
    // Build select expression for all timestamps
    // Using between() for more precise frame selection
    const selectExpr = sortedRequests.map((req) => `between(t,${req.startTime},${req.endTime})`).join('+')

    const args: string[] = [
      ...getGPUDecodeArgs(),
      '-i',
      videoPath,
      '-vf',
      `select='${selectExpr}',scale=${scale}`,
      '-vsync',
      '0',
      '-frame_pts',
      '1',
      '-q:v',
      quality,
      join(tempDir, 'frame_%d.jpg'),
      '-y',
      '-loglevel',
      'error',
    ]

    const ffmpegProcess = await spawnFFmpeg(args)
    await handleFFmpegProcess(ffmpegProcess, 'batch thumbnail extraction')

    // Read extracted frames and map them to requested outputs
    const extractedFrames = fs.readdirSync(tempDir).filter((f) => f.startsWith('frame_'))

    // Copy frames to their final destinations
    for (let i = 0; i < Math.min(extractedFrames.length, sortedRequests.length); i++) {
      const sourcePath = join(tempDir, extractedFrames[i])
      const destPath = sortedRequests[i].outputPath
      fs.copyFileSync(sourcePath, destPath)
    }

    if (extractedFrames.length < sortedRequests.length) {
      logger.warn(`Only extracted ${extractedFrames.length} frames out of ${sortedRequests.length} requested`)
    }

    const endTime = Date.now()

    logger.info(`Thumbnails extracted in ${(endTime - startTime) / 1000}s`)
  } finally {
    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  }
}
