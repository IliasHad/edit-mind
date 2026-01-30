import { mkdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import { spawnFFmpeg } from '../lib/ffmpeg'
import { logger } from '@shared/services/logger'
import { prependGPUArgs } from '@media-utils/lib/ffmpegGpu'

interface ExtractAudioOptions {
  format?: 'wav' | 'mp3' | 'flac'
  sampleRate?: number
  channels?: 1 | 2
  bitrate?: string
}

export const extractSceneAudio = async (
  videoPath: string,
  startTime: number,
  endTime: number,
  options: ExtractAudioOptions = {}
): Promise<string> => {
  const { format = 'wav', sampleRate = 44100, channels = 1, bitrate = '192k' } = options

  if (!existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`)
  }

  const duration = endTime - startTime
  if (duration <= 0) {
    throw new Error('Invalid scene duration: endTime must be greater than startTime')
  }

  const sessionId = randomBytes(8).toString('hex')
  const audioDir = join(tmpdir(), 'edit-mind-audio', sessionId)
  await mkdir(audioDir, { recursive: true })

  const audioPath = join(audioDir, `audio.${format}`)

  try {
    const args = [
      ...prependGPUArgs(),
      '-ss',
      startTime.toFixed(3),
      '-t',
      duration.toFixed(3),
      '-i',
      videoPath,
      '-vn',
      '-acodec',
      format === 'wav' ? 'pcm_s16le' : format === 'flac' ? 'flac' : 'libmp3lame',
      '-ar',
      sampleRate.toString(),
      '-ac',
      channels.toString(),
    ]

    if (format === 'mp3') {
      args.push('-b:a', bitrate)
    }

    args.push('-y', audioPath)

    await new Promise<void>((resolve, reject) => {
      spawnFFmpeg(args)
        .then((ffmpeg) => {
          let stderr = ''

          ffmpeg.stderr?.on('data', (data) => {
            stderr += data.toString()
          })

          ffmpeg.on('close', (code) => {
            if (code === 0 && existsSync(audioPath)) {
              resolve()
            } else {
              reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`))
            }
          })

          ffmpeg.on('error', reject)
        })
        .catch(reject)
    })

    logger.info(`Extracted audio from scene (${startTime}s - ${endTime}s): ${audioPath}`)
    return audioPath
  } catch (error) {
    try {
      if (existsSync(audioPath)) {
        await unlink(audioPath)
      }
    } catch {
      logger.warn(`Failed to cleanup audio file: ${audioPath}`)
    }
    throw error
  }
}

export const cleanupAudio = async (audioPath: string): Promise<void> => {
  try {
    if (existsSync(audioPath)) {
      await unlink(audioPath)
    }
  } catch {
    logger.warn(`Failed to delete audio file: ${audioPath}`)
  }
}

export async function readAudio(audioPath: string, sampling_rate: number = 48000): Promise<Float32Array> {
  if (!existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`)
  }

  return new Promise((resolve, reject) => {
    const args = [
      ...prependGPUArgs(),
      '-i',
      audioPath,
      '-f',
      'f32le',
      '-acodec',
      'pcm_f32le',
      '-ac',
      '1',
      '-ar',
      sampling_rate.toString(),
      '-',
    ]

    spawnFFmpeg(args)
      .then((ffmpeg) => {
        const chunks: Buffer[] = []

        ffmpeg.stdout?.on('data', (chunk) => {
          chunks.push(chunk)
        })

        ffmpeg.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`FFmpeg process exited with code ${code}`))
            return
          }

          try {
            const buffer = Buffer.concat(chunks)
            const audioData = new Float32Array(
              buffer.buffer,
              buffer.byteOffset,
              buffer.length / Float32Array.BYTES_PER_ELEMENT
            )
            resolve(audioData)
          } catch (error) {
            reject(error)
          }
        })

        ffmpeg.on('error', (error) => {
          reject(new Error(`Failed to spawn ffmpeg: ${error.message}`))
        })
      })
      .catch(reject)
  })
}
