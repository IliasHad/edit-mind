import chokidar from 'chokidar'
import path from 'path'
import { SUPPORTED_VIDEO_EXTENSIONS } from '@shared/constants'
import { addVideoIndexingJob } from './services/videoIndexer.js'
import { FolderModel, JobModel } from '@db/index.js'
import { stat } from 'fs/promises'
import { logger } from '@shared/services/logger.js'
import { existsSync } from 'fs'

const watchers = new Map<string, chokidar.FSWatcher>()

export function watchFolder(folderPath: string) {
  if (watchers.has(folderPath)) {
    logger.warn(`Watcher already exists for ${folderPath}`)
    return watchers.get(folderPath)!
  }

  const watcher = chokidar.watch(folderPath, {
    ignored: /^\./,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100,
    },
    atomic: 100,
  })

  watcher.on('add', async (filePath) => {
    try {
      if (!SUPPORTED_VIDEO_EXTENSIONS.test(filePath)) return

      const folder = await FolderModel.findByPath(path.dirname(filePath))

      if (!folder) return
      const stats = await stat(filePath)

      const job = await JobModel.create({
        videoPath: filePath,
        userId: folder.userId,
        folderId: folder.id,
        fileSize: BigInt(stats.size),
      })
      await addVideoIndexingJob({
        videoPath: filePath,
        jobId: job.id,
      })
    } catch (error) {
      logger.error('Error adding new video file while watching for new folder changes: ' + error)
    }
  })

  watchers.set(folderPath, watcher)

  return watcher
}

export async function initializeWatchers() {
  try {
    const folders = await FolderModel.findMany({
      select: { path: true },
    })

    for (const folder of folders) {
      try {
        if (existsSync(folder.path)) {
          watchFolder(folder.path)
        }
      } catch (error) {
        logger.error({ error }, 'Failed to initialize watchers')
      }
    }

    logger.info(`Initialized ${watchers.size} folder watchers`)
  } catch (error) {
    logger.error('Failed to initialize watchers:' + error)
  }
}

export async function stopWatcher(folderPath: string) {
  const watcher = watchers.get(folderPath)

  if (watcher) {
    await watcher.close()
    watchers.delete(folderPath)
    logger.info(`Stopped watcher for ${folderPath}`)
    return true
  }

  logger.warn(`No watcher found for ${folderPath}`)
  return false
}
