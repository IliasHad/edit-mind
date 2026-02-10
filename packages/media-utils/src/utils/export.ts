import { Scene } from '@shared/schemas'
import { spawnFFmpeg } from '@media-utils/lib/ffmpeg'
import path from 'path'
import { existsSync } from 'fs'
import { mkdir } from 'fs/promises'
import { logger } from '@shared/services/logger'
import { buildEncodingArgs } from '@media-utils/lib/ffmpegGpu'
import { USE_FFMPEG_GPU } from '@media-utils/constants'

export const trimVideoScenes = async (scenes: Scene[], tempExportDir: string): Promise<string[]> => {
  const clipPaths: string[] = []

  if (!existsSync(tempExportDir)) {
    await mkdir(tempExportDir, { recursive: true })
  }

  logger.info(`Trimming ${scenes.length} video scenes (GPU: ${USE_FFMPEG_GPU})`)

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]

    const clipPath = path.join(tempExportDir, `scene_${i + 1}_${path.basename(scene.source)}`)
    clipPaths.push(clipPath)

    const encodingArgs = buildEncodingArgs({ encoder: 'h264' })

    const ffmpegArgs = [
      '-ss',
      scene.startTime.toString(),
      '-i',
      scene.source,
      '-to',
      scene.endTime.toString(),
      ...encodingArgs, 
      '-y',
      clipPath,
    ]

    try {
      const ffmpegProcess = await spawnFFmpeg(ffmpegArgs)

      await new Promise<void>((resolve, reject) => {
        let stderr = ''

        ffmpegProcess.stderr?.on('data', (data) => {
          stderr += data.toString()
        })

        ffmpegProcess.on('close', (code) => {
          if (code === 0) {
            logger.info(`Trimmed scene ${i + 1}/${scenes.length}: ${clipPath}`)
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
      logger.error({ error }, `Failed to trim scene ${i + 1}`)
      throw error
    }
  }

  logger.info(`Successfully trimmed ${clipPaths.length} scenes`)
  return clipPaths
}