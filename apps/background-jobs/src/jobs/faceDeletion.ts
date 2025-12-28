import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { logger } from '@shared/services/logger'
import { FaceDeletionJobData } from '@shared/types/face'
import type { FaceDetectionData } from '@shared/types/unknownFace'
import { promises as fs } from 'fs'
import { existsSync } from 'fs'
import path from 'path'
import type { Scene } from '@shared/types/scene'
import { PROCESSED_VIDEOS_DIR, UNKNOWN_FACES_DIR } from '@shared/constants'
import { getByVideoSource, updateMetadata } from '@vector/services/vectorDb'

async function processFaceDeletionJob(job: Job<FaceDeletionJobData>) {
  logger.info({ jobId: job.id }, 'Starting Face Deletion job')

  const jsonPath = path.join(UNKNOWN_FACES_DIR, job.data.jsonFile)
  const imagePath = path.join(UNKNOWN_FACES_DIR, job.data.imageFile)

  if (existsSync(jsonPath)) {
    try {
      const faceData = JSON.parse(await fs.readFile(jsonPath, 'utf8')) as FaceDetectionData
      const { face_id } = faceData
      const video = await getByVideoSource(faceData.video_path)
      const sortedAppearances = faceData.all_appearances?.sort((a, b) => a.frame_index - b.frame_index)

      if (sortedAppearances && video && video.scenes) {
        const firstAppearance = sortedAppearances[0]
        const lastAppearance = sortedAppearances[sortedAppearances.length - 1]

        for (const scene of video.scenes) {
          const overlapsScene =
            firstAppearance.timestamp_seconds <= scene.endTime && lastAppearance.timestamp_seconds >= scene.startTime

          if (!overlapsScene) continue

          if (scene.faces.includes(face_id)) {
            scene.faces = scene.faces.filter((f) => f !== face_id)
          }

          if (scene.facesData) {
            scene.facesData = scene.facesData.filter((f) => f.name !== face_id)
          }

          await updateMetadata(scene)
        }

        const videoDir = path.join(PROCESSED_VIDEOS_DIR, path.basename(faceData.video_path))
        const scenesJsonPath = path.join(videoDir, 'scenes.json')

        if (existsSync(scenesJsonPath)) {
          const fileScenes: Scene[] = JSON.parse(await fs.readFile(scenesJsonPath, 'utf8'))
          let modified = false

          for (const scene of fileScenes) {
            const inRange =
              scene.startTime <= faceData.last_appearance?.timestamp_seconds &&
              scene.endTime >= faceData.first_appearance?.timestamp_seconds

            if (!inRange) continue

            let sceneModified = false

            if (scene.faces.includes(face_id)) {
              scene.faces = scene.faces.filter((f) => f !== face_id)
              sceneModified = true
            }

            if (scene.facesData) {
              const hadFace = scene.facesData.some((f) => f.name === face_id)
              scene.facesData = scene.facesData.filter((f) => f.name !== face_id)

              if (hadFace) sceneModified = true
            }

            if (sceneModified) modified = true
          }

          if (modified) {
            await fs.writeFile(scenesJsonPath, JSON.stringify(fileScenes, null, 2), 'utf8')
          }
        }
      }
    } catch (error) {
      logger.error(error)
      throw error
    }
  }
  if (existsSync(imagePath)) {
    await fs.unlink(imagePath)
  }
  logger.info({ jobId: job.id }, 'Face labelling job completed')
}

export const faceLabellingWorker = new Worker('face-deletion', processFaceDeletionJob, {
  connection,
  concurrency: 3,
})
