import chokidar from 'chokidar'
import path from 'path'
import { videoQueue } from './queue.js'
import { prisma } from './services/db.js'
import { SUPPORTED_VIDEO_EXTENSIONS, SUPPORTED_AUDIO_EXTENSIONS, WATCHER_IGNORED } from '@shared/constants/index'
import { logger } from '@shared/services/logger.js'

function isAudioFolder(p: string): boolean {
  const name = p.toLowerCase()
  return name.includes('/x_audio') || name.endsWith('/audio') || name.includes('xaudio')
}

export function watchFolder(folderPath: string) {
  const useAudio = isAudioFolder(folderPath)
  const extPattern = useAudio ? SUPPORTED_AUDIO_EXTENSIONS : SUPPORTED_VIDEO_EXTENSIONS

  const watcher = chokidar.watch(folderPath, {
    ignored: (p: string) => WATCHER_IGNORED.some((re) => re.test(p)),
    persistent: true,
    ignoreInitial: true,
    depth: 0, // top-level only; avoids heavy recursion (Downloads subdirs, Syncthing internals)
    awaitWriteFinish: { stabilityThreshold: 3000, pollInterval: 100 },
    ignorePermissionErrors: true,
    atomic: true,
  })

  watcher.on('error', (error) => {
    logger.error(`Watcher error for ${folderPath}: ${error.message}`)
    // Do not crash. For EIO/ENOMEM we keep the watcher alive; new file events may still arrive.
  })

  watcher.on('add', async (filePath) => {
    try {
      if (!extPattern.test(filePath)) return

      const folder = await prisma.folder.findFirst({
        where: {
          path: path.dirname(filePath),
        },
      })

      if (!folder) return

      const job = await prisma.job.create({
        data: { videoPath: filePath, userId: folder.userId, folderId: folder.id },
      })
      await videoQueue.add('index-video', { videoPath: filePath, jobId: job.id, folderId: folder.id })
    } catch (error) {
      logger.error(`Error adding file from watcher for ${folderPath}: ${(error as Error).message}`)
    }
  })
}

export async function initializeWatchers() {
  try {
    const folders = await prisma.folder.findMany({
      select: { path: true },
    })

    for (const folder of folders) {
      logger.debug(`Watcher is set for ${folder.path}`)
      watchFolder(folder.path)
    }
  } catch (error) {
    logger.error(`Failed to initialize watchers: ${(error as Error).message}`)
  }
}

export function stopWatcher(folderPath: string) {
  const watcher = chokidar.watch(folderPath, { ignored: (p: string) => WATCHER_IGNORED.some((re) => re.test(p)), persistent: true, ignoreInitial: true })
  if (watcher) {
    watcher.close()
  }
}
