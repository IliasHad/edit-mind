import { trimVideoScenes } from '@media-utils/utils/export'
import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { logger } from '@shared/services/logger'
import { ChatMessageModel, ExportModel } from '@db/index'
import { getVideoWithScenesBySceneIds } from '@vector/services/vectorDb'
import path from 'path'
import { promises as fs, existsSync, createWriteStream } from 'fs'
import { EXPORTS_DIR } from '@media-utils/constants'
import archiver from 'archiver'
import { createStackedThumbnail } from '@media-utils/utils/videos'
import { ExportProcessingJob } from '../schemas/export'

async function processExportJob(job: Job<ExportProcessingJob>) {
  const { exportId, chatMessageId, collectionId } = job.data

  logger.info({ jobId: job.id, ...job.data }, 'Starting export job')

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

    const clipPaths = await trimVideoScenes(scenes, tempExportDir)

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

    if (collectionId) {
      await ExportModel.update(exportId, {
        collectionId: collectionId,
      })
    } else if (chatMessageId) {
      const text = "Here's your exports video zip file!"

      await ChatMessageModel.update(chatMessageId, {
        stage: 'compiling',
        isThinking: false,
        exportId,
        text,
      })

      const message = await ChatMessageModel.update(chatMessageId, {
        exportId,
      })
      return {
        filePath: zipPath,
        messageId: message.id,
      }
    }
    logger.info({ jobId: job.id, exportId }, 'Export job completed')

    return {
      filePath: zipPath,
    }
  } catch (error) {
    logger.error({ jobId: job.id, exportId, error }, 'Export job failed')

    // Update export record to failed status
    await ExportModel.update(exportId, {
      status: 'failed',
    })

    // Update chat message if applicable
    if (chatMessageId) {
      await ChatMessageModel.delete(chatMessageId)
    }

    // Clean up temp directory if it exists
    try {
      const tempExportDir = path.join(EXPORTS_DIR, exportId)
      if (existsSync(tempExportDir)) {
        await fs.rm(tempExportDir, { recursive: true, force: true })
      }
    } catch (cleanupError) {
      logger.error({ jobId: job.id, exportId, cleanupError }, 'Failed to clean up temp directory')
    }

    throw error
  }
}

export const exportWorker = new Worker('export-scenes', processExportJob, {
  connection,
  concurrency: 1,
})
