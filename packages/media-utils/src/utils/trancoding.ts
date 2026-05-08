import { spawnFFmpeg, spawnFFprobe } from '@media-utils/lib/ffmpeg'
import path from 'path'
import { existsSync } from 'fs'
import { mkdir, rename } from 'fs/promises'
import { logger } from '@shared/services/logger'
import { buildEncodingArgs } from '@media-utils/lib/ffmpegGpu'
import { USE_FFMPEG_GPU } from '@media-utils/constants'

const FFPROBE_TIMEOUT_MS = 2 * 60 * 1000
const FFMPEG_TRANSCODE_TIMEOUT_MS = 2 * 60 * 60 * 1000

export class UnsupportedCodecError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsupportedCodecError'
  }
}

// Probe with generous limits so MXF files with malformed descriptors get enough
// analysis time. The default probesize (5 MB) and analyzeduration (0 for some
// demuxers) are too small for professional camera formats like ARRIRAW in MXF.
async function checkVideoCodec(videoPath: string): Promise<string> {
  const args = [
    '-v', 'quiet',
    '-probesize', '100M',
    '-analyzeduration', '100M',
    '-print_format', 'json',
    '-show_streams',
    '-select_streams', 'v:0',
    videoPath,
  ]

  const probe = await spawnFFprobe(args)

  let stdout = ''
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      probe.kill()
      reject(new Error(`ffprobe timed out after ${FFPROBE_TIMEOUT_MS / 1000}s for: ${videoPath}`))
    }, FFPROBE_TIMEOUT_MS)

    probe.stdout?.on('data', (d: Buffer) => { stdout += d.toString() })
    probe.on('close', (code: number | null) => {
      clearTimeout(timer)
      code === 0 ? resolve() : reject(new Error(`ffprobe exited ${code}`))
    })
    probe.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })

  const data = JSON.parse(stdout || '{}')
  const stream = data.streams?.[0]
  const codecName: string = stream?.codec_name ?? 'none'

  if (!stream || codecName === 'none' || codecName === 'unknown') {
    throw new UnsupportedCodecError(
      `Video codec could not be identified (reported as "${codecName}"). ` +
      `The file may use a proprietary codec (e.g. ARRIRAW) that FFmpeg cannot decode. ` +
      `Path: ${videoPath}`
    )
  }

  return codecName
}

export const transcodeVideo = async (
  videoPath: string,
  outputDir: string
): Promise<string> => {
  // Fail fast with a clear error if the codec is undecodable, so the job is not
  // retried pointlessly for formats FFmpeg will never support.
  const codec = await checkVideoCodec(videoPath)
  logger.info(`Detected video codec: ${codec} for ${videoPath}`)

  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true })
  }

  const baseName = path.basename(videoPath, path.extname(videoPath))
  const outputPath = path.join(outputDir, `${baseName}.mp4`)
  const tmpPath = path.join(outputDir, `${baseName}.temp.mp4`)

  logger.info(`Transcoding video to MP4 (GPU: ${USE_FFMPEG_GPU}): ${videoPath} to ${outputPath}`)

  const encodingArgs = buildEncodingArgs({ encoder: 'h264' })

  const ffmpegArgs = [
    '-i',
    videoPath,
    ...encodingArgs,
    '-movflags', '+faststart',
    '-y',
    tmpPath,
  ]

  try {
    const ffmpegProcess = await spawnFFmpeg(ffmpegArgs)

    await new Promise<void>((resolve, reject) => {
      let stderr = ''

      const timer = setTimeout(() => {
        ffmpegProcess.kill()
        reject(new Error(`FFmpeg transcoding timed out after ${FFMPEG_TRANSCODE_TIMEOUT_MS / 1000 / 60} minutes for: ${videoPath}`))
      }, FFMPEG_TRANSCODE_TIMEOUT_MS)

      ffmpegProcess.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      ffmpegProcess.on('close', async (code) => {
        clearTimeout(timer)
        if (code === 0) {
          await rename(tmpPath, outputPath)
          logger.info(`Transcoded video successfully: ${outputPath}`)
          resolve()
        } else {
          reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`))
        }
      })

      ffmpegProcess.on('error', (err) => {
        clearTimeout(timer)
        reject(new Error(`Failed to spawn FFmpeg: ${err.message}`))
      })
    })
  } catch (error) {
    logger.error({ error }, `Failed to transcode video: ${videoPath}`)
    throw error
  }

  return outputPath
}