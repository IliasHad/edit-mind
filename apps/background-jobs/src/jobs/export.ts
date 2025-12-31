import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { logger } from '@shared/services/logger'
import { ExportModel } from '@db/index'
import { getVideoWithScenesBySceneIds } from '@vector/services/vectorDb'
import { spawnFFmpeg } from '@media-utils/lib/ffmpeg'
import path from 'path'
import { promises as fs, existsSync, createWriteStream } from 'fs'
import { EXPORTS_DIR } from '@shared/constants'
import archiver from 'archiver'
import { createStackedThumbnail } from '@media-utils/utils/videos'

interface ExportJobData {
  exportId: string
}

async function processExportJob(job: Job<ExportJobData>) {
  const { exportId } = job.data
  logger.info({ jobId: job.id, exportId }, 'Starting export job')

  if (!existsSync(EXPORTS_DIR)) {
    await fs.mkdir(EXPORTS_DIR, { recursive: true })
  }

  await ExportModel.update(exportId, {
    status: 'processing',
  })

  try {
    const exportRecord = await ExportModel.findById(exportId)
    if (!exportRecord) {
      throw new Error('Export record not found')
    }

    const scenes = await getVideoWithScenesBySceneIds(exportRecord.sceneIds)
    if (!scenes || scenes.length === 0) {
      throw new Error('No scenes found for the provided IDs')
    }
    const thumbnailUrl = await createStackedThumbnail(exportId, scenes)

    await ExportModel.update(exportId, {
      thumbnailUrl,
    })

    const tempExportDir = path.join(EXPORTS_DIR, exportId)
    if (!existsSync(tempExportDir)) {
      await fs.mkdir(tempExportDir, { recursive: true })
    }

    const clipPaths: string[] = []
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

      const progress = ((i + 1) / scenes.length) * 90
      await job.updateProgress(progress)
      await ExportModel.update(exportId, {
        progress,
      })
    }

    const zipPath = path.join(EXPORTS_DIR, `${exportId}.zip`)
    const output = createWriteStream(zipPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    await new Promise<void>((resolve, reject) => {
      output.on('close', () => {
        logger.info(`Zip created: ${archive.pointer()} total bytes`)
        resolve()
      })

      archive.on('error', (err) => {
        reject(err)
      })

      archive.pipe(output)

      // Add all clip files to the archive
      for (const clipPath of clipPaths) {
        archive.file(clipPath, { name: path.basename(clipPath) })
      }

      archive.finalize()
    })

    await ExportModel.update(exportId, {
      status: 'ready',
      filePath: zipPath,
    })

    await fs.rm(tempExportDir, { recursive: true, force: true })

    logger.info({ jobId: job.id, exportId }, 'Export job completed')
    await job.updateProgress(100)
  } catch (error) {
    logger.error({ jobId: job.id, exportId, error }, 'Export job failed')
    await ExportModel.update(exportId, {
      status: 'failed',
    })
    throw error
  }
}

export const exportWorker = new Worker('export-scenes', processExportJob, {
  connection,
  concurrency: 3,
})

exportWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Export job completed')
})

exportWorker.on('failed', (job, err) => {
  logger.error(
    {
      jobId: job?.id,
      error: err.message,
      stack: err.stack,
    },
    'Export job failed'
  )
})
