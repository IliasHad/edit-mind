import { spawnFFmpeg } from '@media-utils/lib/ffmpeg'
import path from 'path'
import { existsSync } from 'fs'
import { mkdir, rename } from 'fs/promises'
import { logger } from '@shared/services/logger'
import { buildEncodingArgs } from '@media-utils/lib/ffmpegGpu'
import { USE_FFMPEG_GPU } from '@media-utils/constants'

export const transcodeVideo = async (
  videoPath: string,
  outputDir: string
): Promise<string> => {
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

      ffmpegProcess.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      ffmpegProcess.on('close', async (code) => {
        if (code === 0) {
          await rename(tmpPath, outputPath)
          logger.info(`Transcoded video successfully: ${outputPath}`)
          resolve()
        } else {
          reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`))
        }
      })

      ffmpegProcess.on('error', (err) => {
        reject(new Error(`Failed to spawn FFmpeg: ${err.message}`))
      })
    })
  } catch (error) {
    logger.error({ error }, `Failed to transcode video: ${videoPath}`)
    throw error
  }

  return outputPath
}