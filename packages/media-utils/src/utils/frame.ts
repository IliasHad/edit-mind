import { mkdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import { spawnFFmpeg } from '../lib/ffmpeg'
import { logger } from '@shared/services/logger'
import { prependGPUArgs } from '@media-utils/lib/ffmpegGpu';

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
  const { framesPerScene = 3, format = 'jpg', quality = 2, maxWidth = 1280 } = options

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

  const framePaths: string[] = []

  try {
    const interval = duration / (framesPerScene + 1)

    for (let i = 1; i <= framesPerScene; i++) {
      const timestamp = startTime + interval * i
      const framePath = join(framesDir, `frame_${i}.${format}`)
      
      const args = [
        '-hide_banner',
        '-loglevel',
        'error',
        ...prependGPUArgs(),
        '-i',
        videoPath,
        '-ss',
        timestamp.toFixed(3),
        '-frames:v',
        '1',
        '-vsync',
        '0',
        '-vf',
        `scale=${maxWidth}:-1`,
      ]

      if (format === 'jpg') {
        args.push('-q:v', quality.toString())
      }

      args.push(framePath)

      await new Promise<void>((resolve, reject) => {
        spawnFFmpeg(args)
          .then((ffmpeg) => {
            let stderr = ''

            ffmpeg.stderr?.on('data', (data) => {
              stderr += data.toString()
            })

            ffmpeg.on('close', (code) => {
              if (code === 0 && existsSync(framePath)) {
                framePaths.push(framePath)
                resolve()
              } else {
                reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`))
              }
            })

            ffmpeg.on('error', reject)
          })
          .catch(reject)
      })
    }

    if (framePaths.length === 0) {
      throw new Error('No frames were extracted')
    }

    logger.info(`Extracted ${framePaths.length} frames from scene (${startTime}s - ${endTime}s)`)
    return framePaths
  } catch (error) {
    for (const framePath of framePaths) {
      try {
        if (existsSync(framePath)) {
          await unlink(framePath)
        }
      } catch (cleanupError) {
        logger.warn({ cleanupError }, `Failed to cleanup frame: ${framePath}`)
      }
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
