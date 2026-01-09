import { Scene } from '@shared/schemas'
import { spawnFFmpeg } from '@media-utils/lib/ffmpeg'
import path from 'path'
import { existsSync } from 'fs'
import { mkdir } from 'fs/promises'
import { logger } from '@shared/services/logger'

export const trimVideoScenes = async (scenes: Scene[], tempExportDir: string): Promise<string[]> => {
  const clipPaths: string[] = []

  if (!existsSync(tempExportDir)) {
    await mkdir(tempExportDir, { recursive: true })
  }

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]

    const clipPath = path.join(tempExportDir, `scene_${i + 1}_${path.basename(scene.source)}`)
    clipPaths.push(clipPath)

    const ffmpegArgs = [
      '-i',
      scene.source,
      '-ss',
      scene.startTime.toString(),
      '-to',
      scene.endTime.toString(),
      '-c:v',
      'libx264',
      '-c:a',
      'aac',
      clipPath,
      '-y',
    ]

    try {
      const ffmpegProcess = await spawnFFmpeg(ffmpegArgs)

      await new Promise<void>((resolve, reject) => {
        ffmpegProcess.on('close', (code) => {
          if (code === 0) {
            resolve()
          } else {
            reject(new Error(`FFmpeg exited with code ${code}`))
          }
        })
      })
    } catch (error) {
      logger.error(error)
    }
  }
  return clipPaths
}
