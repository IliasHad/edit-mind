import express from 'express'
import { prisma } from '../services/db'
import { findVideoFiles, findAudioFiles } from '@shared/utils/videos';
import { watchFolder } from '../watcher'
import { videoQueue } from 'src/queue'
import { getVideosNotEmbedded } from '@shared/services/vectorDb';

const router = express.Router()

function isAudioFolder(p: string): boolean {
  const name = p.toLowerCase()
  return name.includes('/x_audio') || name.endsWith('/audio') || name.includes('xaudio')
}

router.post('/trigger', async (req, res) => {
  const { folderPath } = req.body
  if (!folderPath) return res.status(400).json({ error: 'folderPath required' })

  try {
    const useAudio = isAudioFolder(folderPath)
    const mediaFiles = useAudio ? await findAudioFiles(folderPath) : await findVideoFiles(folderPath)
    const uniqueMedia = await getVideosNotEmbedded(mediaFiles.map((f) => f.path))
    const folder = await prisma.folder.update({
      where: { path: folderPath },
      data: {
        videoCount: uniqueMedia.length,
        lastScanned: new Date(),
      },
    })

    watchFolder(folderPath)

    for (const mediaPath of uniqueMedia) {
      const job = await prisma.job.upsert({
        where: { videoPath: mediaPath, id: '' },
        create: {
          videoPath: mediaPath,
          userId: folder?.userId,
          folderId: folder.id,
        },
        update: { folderId: folder.id},
      })
      await videoQueue.add('index-video', { videoPath: mediaPath, jobId: job.id, folderId: folder.id })
    }

    res.json({
      message: useAudio ? 'Audio folder scanned and files queued' : 'Folder added and videos queued for processing',
      folder,
      queuedFiles: uniqueMedia.length,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to process folder' })
  }
})

export default router
