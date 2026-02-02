import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { logger } from '@shared/services/logger'
import { FaceLabellingJobData } from '@shared/types/face'
import type { UnknownFace } from '@shared/types/unknownFace'
import { promises as fs } from 'fs'
import { existsSync } from 'fs'
import path from 'path'
import { FACES_DIR, UNKNOWN_FACES_DIR } from '@shared/constants'
import { getByVideoSource, updateMetadata } from '@vector/services/db'
import { importVideoFromVectorDb } from '../utils/videos'
import { rebuildFacesCache } from '@shared/utils/faces'
import { suggestionCache } from '@search/services/suggestion'
import { JobModel } from '@db/index'

async function processFaceLabellingJob(job: Job<FaceLabellingJobData>) {
  const { faces, name } = job.data
  logger.debug({ jobId: job.id }, 'Starting Face labelling job')

  const personDir = path.join(FACES_DIR, name)
  if (!existsSync(personDir)) {
    await fs.mkdir(personDir, { recursive: true })
  }

  try {
    const updatedScene = new Map<string, string>()
    const processedVideos = new Set<string>()

    for (const face of faces) {
      try {
        const jsonPath = path.join(UNKNOWN_FACES_DIR, face.jsonFile)

        let faceData: UnknownFace
        try {
          faceData = JSON.parse(await fs.readFile(jsonPath, 'utf8'))
        } catch (error) {
          logger.error({ error, jsonPath }, 'Failed to parse JSON')
          continue
        }

        const job = await JobModel.findById(faceData.job_id)

        if (!job) throw new Error('Job not found')

        const video = await getByVideoSource(job?.videoPath)

        if (video) {
          for (const scene of video.scenes) {
            scene.faces = scene.faces.map((f) => (String(f) === String(face.faceId) ? name : f))

            if (scene.emotions) {
              scene.emotions = scene.emotions.map((e) => (e.name === face.faceId ? { ...e, name } : e))
            }

            if (scene.facesData) {
              scene.facesData = scene.facesData.map((f) =>
                String(f.name) === String(face.faceId) ? { ...f, name, confidence: 100 } : f
              )
            }

            await updateMetadata(scene)
            updatedScene.set(faceData.face_id, scene.id)
          }

          processedVideos.add(faceData.video_path)
        }

        // Copy image to known faces directory
        const srcImagePath = path.join(UNKNOWN_FACES_DIR, faceData.image_file)
        const destImagePath = path.join(personDir, faceData.image_file)

        if (existsSync(srcImagePath)) {
          await fs.copyFile(srcImagePath, destImagePath)
          await fs.unlink(srcImagePath)
        }
        // Now delete the JSON file
        await fs.unlink(jsonPath)
      } catch (err) {
        logger.error({ error: err, face }, 'Error processing face label')
      }
    }

    // Reimport all affected videos once
    for (const videoPath of processedVideos) {
      const video = await getByVideoSource(videoPath)
      if (video) {
        await importVideoFromVectorDb(video)
      }
    }

    await rebuildFacesCache()

    await suggestionCache.refresh()

    logger.debug(
      {
        jobId: job.id,
        updatedScenes: updatedScene.size,
        processedVideos: processedVideos.size,
      },
      'Face labelling job completed'
    )

    return {
      updatedScene: Array.from(updatedScene),
      processedVideos: Array.from(processedVideos),
    }
  } catch (error) {
    logger.error(error)
  }
}

export const faceLabellingWorker = new Worker('face-labelling', processFaceLabellingJob, {
  connection,
  concurrency: 1,
})
