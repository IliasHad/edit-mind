import { mkdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import { spawnFFmpeg, spawnFFprobe } from '../lib/ffmpeg'
import { logger } from '@shared/services/logger'
import { prependGPUArgs } from '@media-utils/lib/ffmpegGpu'
import { validateFile } from '@shared/utils/file'

interface ExtractAudioOptions {
  format?: 'wav' | 'mp3' | 'flac'
  sampleRate?: number
  channels?: 1 | 2
  bitrate?: string
}

export async function hasAudioStream(videoFullPath: string): Promise<boolean> {
  try {
    await validateFile(videoFullPath);

    const args = [
      '-v', 'quiet', 
      '-select_streams', 'a', 
      '-show_entries', 'stream=index', 
      '-print_format', 'json', 
      videoFullPath
    ];

    const ffprobeProcess = await spawnFFprobe(args);

    let stdout = '';
    let stderr = '';

    ffprobeProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    ffprobeProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    await new Promise<void>((resolve, reject) => {
      ffprobeProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFprobe failed with code ${code}: ${stderr || 'Unknown error'}`));
        }
      });

      ffprobeProcess.on('error', (err) => {
        reject(new Error(`Failed to spawn FFprobe: ${err.message}`));
      });
    });

    const metadata = JSON.parse(stdout);
    
    return !!(metadata.streams && metadata.streams.length > 0);

  } catch (error) {
    logger.error(`Error checking for audio stream: ${error instanceof Error ? error.message : 'Unknown error'}`);
    // Default to false if we can't read the file, to prevent ffmpeg from crashing on extraction
    return false;
  }
}

export const extractSceneAudio = async (
  videoPath: string,
  startTime: number,
  endTime: number,
  options: ExtractAudioOptions = {}
): Promise<string | undefined> => {
  const { format = 'wav', sampleRate = 44100, channels = 1, bitrate = '192k' } = options

  if (!existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`)
  }

  const duration = endTime - startTime
  if (duration <= 0) {
    throw new Error('Invalid scene duration: endTime must be greater than startTime')
  }
  const hasAudio = await hasAudioStream(videoPath);

  if (!hasAudio) {
   return undefined;
  }

  const sessionId = randomBytes(8).toString('hex')
  const audioDir = join(tmpdir(), 'edit-mind-audio', sessionId)
  await mkdir(audioDir, { recursive: true })

  const audioPath = join(audioDir, `audio.${format}`)

  try {
    const args = [
      ...prependGPUArgs(),
      '-i',
      videoPath,
      '-ss',
      startTime.toFixed(3),
      '-t',
      duration.toFixed(3),
      '-vn',
      '-map',
      '0:a:0',
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
