import { getEmbeddings } from '@embedding-core/services/extractors'
import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { logger } from '@shared/services/logger'
import { FaceDeletionJobData } from '@shared/types/face'
import type { UnknownFace } from '@shared/types/unknownFace'
import { promises as fs } from 'fs'
import { existsSync } from 'fs'
import path from 'path'
import { UNKNOWN_FACES_DIR } from '@shared/constants'
import { getByVideoSource, updateMetadata } from '@vector/services/db'
import { importVideoFromVectorDb } from '../utils/videos'
import { suggestionCache } from '@search/services/suggestion'
import { sceneToVectorFormat } from '@vector/utils/shared'

async function processFaceDeletionJob(job: Job<FaceDeletionJobData>) {
  logger.debug({ jobId: job.id }, 'Starting Face Deletion job')

  const jsonPath = path.join(UNKNOWN_FACES_DIR, job.data.jsonFile)
  const imagePath = path.join(UNKNOWN_FACES_DIR, job.data.imageFile)
  const updatedSceneIds = new Set<string>()

  if (!existsSync(jsonPath)) {
    logger.warn({ jsonPath }, 'JSON file not found')
    // Clean up orphaned image
    if (existsSync(imagePath)) {
      await fs.unlink(imagePath)
    }
    return { updatedSceneIds: [], message: 'JSON not found' }
  }

  try {
    const faceData = JSON.parse(await fs.readFile(jsonPath, 'utf8')) as UnknownFace
    const { face_id } = faceData

    // Update vector DB
    const video = await getByVideoSource(faceData.video_path)

    if (video?.scenes) {
      for (const scene of video.scenes) {
        if (scene.faces.includes(face_id)) {
          // Remove face from scene
          scene.faces = scene.faces.filter((f) => f !== face_id)

          // Remove from face data
          if (scene.facesData) {
            scene.facesData = scene.facesData.filter((f) => f.name !== face_id)
          }

          if (scene.emotions) {
            scene.emotions = scene.emotions.filter((e) => e.name !== face_id)
          }

          // Update vector DB entries
          const vector = await sceneToVectorFormat(scene)
          const embedding = await getEmbeddings([vector.text])

          await updateMetadata(vector, embedding)
          updatedSceneIds.add(scene.id)
        }
      }

      // Reimport video once after all scene updates
      await importVideoFromVectorDb(video)
    }

    // Delete files after successful DB update
    if (existsSync(imagePath)) {
      await fs.unlink(imagePath)
    }
    await fs.unlink(jsonPath)

    await suggestionCache.refresh()

    logger.debug(
      {
        jobId: job.id,
        face_id,
        updatedScenes: updatedSceneIds.size,
      },
      'Face deletion completed'
    )

    return {
      updatedSceneIds: Array.from(updatedSceneIds),
      deletedFaceId: face_id,
    }
  } catch (error) {
    logger.error({ error, jsonPath }, 'Error processing face deletion')
    throw error
  }
}

export const faceDeletionWorker = new Worker('face-deletion', processFaceDeletionJob, {
  connection,
  concurrency: 1,
})
