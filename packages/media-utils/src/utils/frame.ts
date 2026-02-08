import { mkdir, unlink, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import { spawnFFmpeg } from '../lib/ffmpeg'
import { logger } from '@shared/services/logger'
import { getGPUDecodeArgs } from '@media-utils/lib/ffmpegGpu'

interface ExtractFramesOptions {
  framesPerScene?: number
  format?: 'jpg' | 'png'
  quality?: number
  maxWidth?: number
}

export const extractSceneFrames = async (
  videoPath: string,
  startTime: number,
  endTime: number,
  options: ExtractFramesOptions = {}
): Promise<string[]> => {
  const { framesPerScene = 3, format = 'jpg', quality = 2, maxWidth } = options

  if (!existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`)
  }

  const duration = endTime - startTime
  if (duration <= 0) {
    throw new Error('Invalid scene duration: endTime must be greater than startTime')
  }

  const sessionId = randomBytes(8).toString('hex')
  const framesDir = join(tmpdir(), 'edit-mind-frames', sessionId)
  await mkdir(framesDir, { recursive: true })

  // Calculate fps to extract exactly framesPerScene frames in the duration
  const fps = framesPerScene / duration

  // Build FFmpeg arguments
  const outputPattern = join(framesDir, `frame_%04d.${format}`)
  const args: string[] = [
    '-hide_banner',
    '-loglevel',
    'error',
    ...getGPUDecodeArgs(),
    '-ss',
    startTime.toFixed(3),
    '-to',
    endTime.toFixed(3),
    '-i',
    videoPath,
    '-vf',
    maxWidth ? `fps=${fps},${format === 'jpg' ? `scale=${maxWidth}:-1` : `scale=${maxWidth}:-1`}` : `fps=${fps}`,
  ]

  if (format === 'jpg') {
    args.push('-q:v', quality.toString())
  }

  args.push(outputPattern)

  try {
    await new Promise<void>((resolve, reject) => {
      spawnFFmpeg(args)
        .then((ffmpeg) => {
          let stderr = ''
          ffmpeg.stderr?.on('data', (data) => (stderr += data.toString()))
          ffmpeg.on('close', (code) => {
            if (code === 0) resolve()
            else reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`))
          })
          ffmpeg.on('error', reject)
        })
        .catch(reject)
    })

    // Read generated frame paths
    const files = await readdir(framesDir)
    const framePaths = files
      .filter((f) => f.endsWith(`.${format}`))
      .map((f) => join(framesDir, f))
      .sort()

    if (framePaths.length === 0) {
      throw new Error('No frames were extracted')
    }

    logger.info(`Extracted ${framePaths.length} frames from scene (${startTime}s - ${endTime}s)`)
    return framePaths
  } catch (error) {
    // Cleanup partial frames
    try {
      const files = await readdir(framesDir)
      for (const f of files) {
        await unlink(join(framesDir, f))
      }
    } catch (cleanupError) {
      logger.warn({ cleanupError }, `Failed to cleanup frames`)
    }
    throw error
  }
}

export const cleanupFrames = async (framePaths: string[]): Promise<void> => {
  const deletePromises = framePaths.map(async (framePath) => {
    try {
      if (existsSync(framePath)) {
        await unlink(framePath)
      }
    } catch {
      logger.warn(`Failed to delete frame: ${framePath}`)
    }
  })

  await Promise.all(deletePromises)
}
