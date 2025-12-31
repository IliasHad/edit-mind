import chokidar from 'chokidar'
import path from 'path'
import { SUPPORTED_VIDEO_EXTENSIONS } from '@shared/constants/index'
import { addVideoIndexingJob } from './services/videoIndexer.js'
import { FolderModel, JobModel } from '@db/index.js'
import { stat } from 'fs/promises'

export function watchFolder(folderPath: string) {
  const watcher = chokidar.watch(folderPath, { ignored: /^\./, persistent: true, ignoreInitial: true })

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
      console.error('Error adding new video file while watching for new folder changes: ', error)
    }
  })
}

export async function initializeWatchers() {
  try {
    const folders = await FolderModel.findMany({
      select: { path: true },
    })

    for (const folder of folders) {
      watchFolder(folder.path)
    }
  } catch (error) {
    console.error('Failed to initialize watchers:', error)
  }
}

export function stopWatcher(folderPath: string) {
  const watcher = chokidar.watch(folderPath, { ignored: /^\./, persistent: true, ignoreInitial: true })
  if (watcher) {
    watcher.close()
  }
}
