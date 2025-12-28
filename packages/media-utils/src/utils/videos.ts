import fs from 'fs'
import path from 'path'
import { ChildProcess } from 'child_process'
import {
  BATCH_THUMBNAIL_QUALITY,
  DEFAULT_FPS,
  MAX_DEPTH,
  SUPPORTED_VIDEO_EXTENSIONS,
  THUMBNAIL_QUALITY,
  THUMBNAIL_SCALE,
  THUMBNAILS_DIR,
} from '../constants'
import { exiftool } from 'exiftool-vendored'
import { CameraInfo, GeoLocation, VideoFile, VideoMetadata, FFmpegError } from '../types/video'
import { spawnFFmpeg, spawnFFprobe } from '../lib/ffmpeg'
import { validateFile } from '@shared/utils/file'
import { logger } from '@shared/services/logger'
import { FFprobeMetadata, FFprobeStream } from '../types/ffmpeg'
import { Scene } from '@shared/schemas'
import * as Jimp from 'jimp'
import { readFile } from 'fs/promises'

const initializeThumbnailsDir = (): void => {
  if (!fs.existsSync(THUMBNAILS_DIR)) {
    fs.mkdirSync(THUMBNAILS_DIR, { recursive: true })
  }
}

initializeThumbnailsDir()

const handleFFmpegProcess = (process: ChildProcess, operationName: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    let errorOutput = ''

    process.stderr?.on('data', (data) => {
      errorOutput += data.toString()
    })

    process.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        const error: FFmpegError = new Error(
          `FFmpeg ${operationName} failed with code ${code}: ${errorOutput.trim() || 'Unknown error'}`
        )
        error.code = code ?? undefined
        error.stderr = errorOutput
        reject(error)
      }
    })

    process.on('error', (err) => {
      reject(new Error(`Failed to spawn FFmpeg for ${operationName}: ${err.message}`))
    })
  })
}

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

  const args = [
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

export async function generateAllThumbnails(
  videoPath: string,
  timestamps: number[],
  outputPaths: string[]
): Promise<void> {
  if (timestamps.length === 0) {
    return
  }

  if (timestamps.length !== outputPaths.length) {
    throw new Error(`Timestamps and output paths length mismatch: ${timestamps.length} vs ${outputPaths.length}`)
  }

  await validateFile(videoPath)

  const filterComplex = timestamps
    .map(
      (ts, idx) =>
        `[0:v]select='between(t,${ts},${ts + 0.1})',setpts=PTS-STARTPTS,scale=${THUMBNAIL_SCALE}:flags=fast_bilinear[v${idx}]`
    )
    .join(';')

  const args = [
    '-i',
    videoPath,
    '-filter_complex',
    filterComplex,
    '-q:v',
    BATCH_THUMBNAIL_QUALITY,
    '-loglevel',
    'error',
  ]

  timestamps.forEach((_, idx) => {
    args.push('-map', `[v${idx}]`, '-frames:v', '1', outputPaths[idx])
  })

  args.push('-y')

  const ffmpegProcess = await spawnFFmpeg(args)
  return handleFFmpegProcess(ffmpegProcess, 'batch thumbnail generation')
}

export async function findVideoFiles(
  dirPath: string,
  currentDepth: number = 0,
  maxDepth: number = MAX_DEPTH
): Promise<VideoFile[]> {
  if (currentDepth > maxDepth) {
    return []
  }

  try {
    const items = await fs.promises.readdir(dirPath)
    const results: VideoFile[][] = []
    for (const item of items) {
      const fullPath = path.join(dirPath, item)

      try {
        const stats = await fs.promises.stat(fullPath)

        if (stats.isDirectory()) {
          results.push(await findVideoFiles(fullPath, currentDepth + 1, maxDepth))
        } else if (stats.isFile() && SUPPORTED_VIDEO_EXTENSIONS.test(item)) {
          results.push([{ path: fullPath, mtime: stats.mtime }])
        }
      } catch (error) {
        logger.warn(
          `Warning: Could not access ${fullPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    return results.flat().sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
  } catch (error) {
    logger.error(`Error reading directory ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return []
  }
}

const extractCameraInfo = (tags: Record<string, string>, videoPath: string): string => {
  const cameraMake = tags['com.apple.quicktime.make'] || tags['make'] || tags['encoder'] || ''
  const cameraModel = tags['com.apple.quicktime.model'] || tags['model'] || tags['com.android.version'] || ''
  const goProModel = tags['camera_model_name'] || tags['DeviceName'] || tags['device_name'] || ''

  const isGoPro =
    cameraMake.toLowerCase().includes('gopro') ||
    goProModel.toLowerCase().includes('gopro') ||
    tags['encoder']?.toLowerCase().includes('gopro') ||
    videoPath.includes('GX')

  if (isGoPro) {
    return goProModel || cameraMake || cameraModel || 'GoPro'
  }

  if (cameraMake && cameraModel) {
    return `${cameraMake} ${cameraModel}`.trim()
  }

  return cameraMake || cameraModel || goProModel || 'Unknown'
}

export async function getCameraNameAndDate(videoFullPath: string): Promise<CameraInfo> {
  try {
    await validateFile(videoFullPath)

    const args = ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', videoFullPath]

    const ffprobeProcess = await spawnFFprobe(args)

    let stdout = ''
    let stderr = ''

    ffprobeProcess.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    ffprobeProcess.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    await new Promise<void>((resolve, reject) => {
      ffprobeProcess.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`FFprobe failed with code ${code}: ${stderr || 'Unknown error'}`))
        }
      })

      ffprobeProcess.on('error', (err) => {
        reject(new Error(`Failed to spawn FFprobe: ${err.message}`))
      })
    })

    const metadata = JSON.parse(stdout)
    const tags = metadata.format?.tags || {}

    let createdAt = tags.creation_time || tags['com.apple.quicktime.creationdate'] || 'Unknown'

    const camera = extractCameraInfo(tags, videoFullPath)

    // Fallback to file creation date if metadata doesn't contain creation time
    if (!createdAt || createdAt === 'Unknown') {
      const stats = await fs.promises.stat(videoFullPath)
      createdAt = stats.birthtime.toISOString()
    }

    return { camera, createdAt }
  } catch (error) {
    logger.error(`Error extracting camera metadata: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return { camera: 'Unknown', createdAt: 'Unknown' }
  }
}

const parseFPS = (frameRate: string | undefined): number => {
  if (!frameRate) return DEFAULT_FPS

  try {
    // Handle fraction format (e.g., "30000/1001")
    if (frameRate.includes('/')) {
      const [numerator, denominator] = frameRate.split('/').map(Number)
      return denominator ? numerator / denominator : DEFAULT_FPS
    }
    return parseFloat(frameRate) || DEFAULT_FPS
  } catch {
    return DEFAULT_FPS
  }
}
export async function getVideoMetadata(videoFilePath: string): Promise<VideoMetadata> {
  await validateFile(videoFilePath)

  try {
    const args = ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', videoFilePath]

    const ffprobeProcess = await spawnFFprobe(args)

    let stdout = ''
    let stderr = ''

    ffprobeProcess.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    ffprobeProcess.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    await new Promise<void>((resolve, reject) => {
      ffprobeProcess.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`FFprobe failed with code ${code}: ${stderr || 'Unknown error'}`))
        }
      })

      ffprobeProcess.on('error', (err) => {
        reject(new Error(`Failed to spawn FFprobe: ${err.message}`))
      })
    })

    const metadata: FFprobeMetadata = JSON.parse(stdout)
    const videoStream = metadata.streams.find((s: FFprobeStream) => s.codec_type === 'video')

    if (!videoStream) {
      throw new Error('No video stream found in file')
    }

    const duration =
      typeof metadata.format.duration === 'string'
        ? parseFloat(metadata.format.duration)
        : metadata.format.duration || 0

    const fps = parseFPS(videoStream.r_frame_rate)
    let width = videoStream.width || 0
    let height = videoStream.height || 0

    // Handle rotation metadata
    const streamRotate = videoStream.tags?.rotate
    const formatRotate = metadata.format.tags?.rotate
    const rotation =
      typeof streamRotate === 'string'
        ? parseInt(streamRotate, 10)
        : streamRotate || (typeof formatRotate === 'string' ? parseInt(formatRotate, 10) : formatRotate) || 0

    if (rotation === 90 || rotation === 270 || rotation === -90 || rotation === -270) {
      // Swap width and height for rotated videos
      ;[width, height] = [height, width]
    }

    // Handle display aspect ratio if available
    const displayAspectRatio = videoStream.display_aspect_ratio

    const totalFrames = Math.floor(duration * fps)

    return {
      duration,
      fps,
      width,
      height,
      totalFrames,
      rotation,
      displayAspectRatio,
    }
  } catch (error) {
    throw new Error(`Failed to get video metadata: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0s'
  }

  if (seconds < 60) {
    return `${Math.floor(seconds)}s`
  }

  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}m ${secs}s`
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

const parseCoordinate = (value: number | string | undefined): number | undefined => {
  if (value === null || value === undefined) return undefined

  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export async function getLocationFromVideo(videoFullPath: string): Promise<GeoLocation> {
  try {
    await validateFile(videoFullPath)

    const tags = await exiftool.read(videoFullPath)

    const latitude = parseCoordinate(tags.GPSLatitude)
    const longitude = parseCoordinate(tags.GPSLongitude)
    const altitude = parseCoordinate(tags.GPSAltitude)

    if (latitude === undefined && longitude === undefined && altitude === undefined) {
      logger.warn(`No GPS data found in video: ${videoFullPath}`)
    }

    return { latitude, longitude, altitude }
  } catch (error) {
    logger.error(`Error extracting GPS data:  ${error instanceof Error ? error.message : 'Unknown error'}`)
    return {
      latitude: undefined,
      longitude: undefined,
      altitude: undefined,
    }
  }
}

export async function createStackedThumbnail(exportId: string, scenes: Scene[]) {
  const selectedScenes = scenes.slice(0, 3)
  const images = []

  for (const scene of selectedScenes) {
    if (!scene.thumbnailUrl) continue
    const imageBuffer = await readFile(scene.thumbnailUrl)
    const image = await Jimp.Jimp.read(imageBuffer)
    images.push(image)
  }

  const width = 1280
  const height = 800
  const stackedImage = new Jimp.Jimp({ width, height, color: 0x000000ff })
  const overlap = 40 // how much each card overlaps the previous one
  const cardHeight = Math.min(height * 0.7, (height + (images.length - 1) * overlap) / images.length)

  let y = 0
  for (const img of images) {
    img.cover({ w: width, h: cardHeight })
    stackedImage.composite(img, 0, y)
    y += cardHeight - overlap
  }

  const thumbnailPath = path.join(THUMBNAILS_DIR, `${exportId}_thumbnail.jpg`)
  await stackedImage.write(`${THUMBNAILS_DIR}/${exportId}_thumbnail.jpg`)

  return thumbnailPath
}
