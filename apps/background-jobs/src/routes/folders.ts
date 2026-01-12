import express from 'express'
import { findVideoFiles } from '@media-utils/utils/videos'
import { addVideoIndexingJob } from '../services/videoIndexer'
import { FolderModel, JobModel } from '@db/index'
import { logger } from '@shared/services/logger'
import { deleteJobsByDataJobId } from '../utils/jobs'

const router = express.Router()

router.post('/:id/trigger', async (req, res) => {
  const { id } = req.params

  if (!id) return res.status(400).json({ error: 'folder Id required' })

  try {
    const videosInDb = await JobModel.findMany({
      where: {
        status: { in: ['pending', 'processing'] },
      },
    })

    const folder = await FolderModel.findById(id)

    if (!folder) return res.status(400).json({ error: 'Folder is not found' })

    await FolderModel.update(folder.id, { status: 'scanning' })
    const videos = await findVideoFiles(folder.path, folder.includePatterns, folder.excludePatterns)

    const videosInDbPaths = videosInDb.map((item) => item.videoPath)

    const uniqueVideos = videos.filter((video) => !videosInDbPaths.includes(video.path.toString()))

    await FolderModel.update(folder.id, {
      videoCount: uniqueVideos.length,
      lastScanned: new Date(),
    })

    for await (const video of uniqueVideos) {
      const job = await JobModel.create({
        videoPath: video.path,
        userId: folder.userId,
        folderId: folder.id,
        fileSize: BigInt(video.size),
      })
      await addVideoIndexingJob({
        videoPath: video.path,
        jobId: job.id,
      })
    }

    await FolderModel.update(folder.id, { status: 'idle' })

    res.json({
      message: 'Folder added and videos queued for processing',
      folder,
      queuedVideos: uniqueVideos.length,
    })
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: 'Failed to process folder' })
  }
})

router.post('/:id/delete', async (req, res) => {
  const { id } = req.params

  try {
    const folder = await FolderModel.findById(id)
    if (!folder) {
      throw new Error('Error finding the folder over database')
    }

    const jobs = await JobModel.findMany({
      where: {
        folderId: folder.id,
      },
    })
    for await (const job of jobs) {
      await deleteJobsByDataJobId(job.id)
    }

    await FolderModel.delete(id)

    res.json({
      message: 'Folder and videos jobs deleted',
      folder,
    })
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: 'Failed to delete a folder' })
  }
})

export default router
