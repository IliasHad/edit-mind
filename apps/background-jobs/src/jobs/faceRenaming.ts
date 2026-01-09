import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { logger } from '@shared/services/logger'
import { searchScenes } from '@search/services'
import { VideoSearchParamsSchema } from '@shared/schemas/search'
import { getByVideoSource, updateMetadata } from '@vector/services/vectorDb'
import { importVideoFromVectorDb } from 'src/utils/videos'
import path from 'path'
import { FACES_DIR } from '@shared/constants'
import { existsSync } from 'fs'
import { rename } from 'fs/promises'
import { rebuildFacesCache } from '@shared/utils/faces'
import { FaceRenamingJobData } from '@shared/types/face'
import { suggestionCache } from '@search/services/suggestion'

async function processFaceRenamingJob(job: Job<FaceRenamingJobData>) {
  const { oldName, newName } = job.data

  logger.debug({ jobId: job.id, oldName, newName }, 'Starting Face Renaming job')

  try {
    const updatedScene = new Set<string>()
    const processedVideos = new Set<string>()

    const videos = await searchScenes(
      VideoSearchParamsSchema.parse({
        faces: [oldName],
        searchMode: 'text',
      }),
      undefined,
      true
    )

    const scenes = videos.flatMap((video) => video.scenes)

    for (const scene of scenes) {
      const match = scene.faces.some((f) => String(f) === oldName)
      if (!match) continue

      scene.faces = scene.faces.map((f) => (String(f) === oldName ? newName : f))

      if (scene.emotions) {
        scene.emotions = scene.emotions.map((e) => (e.name === oldName ? { ...e, name: newName } : e))
      }

      if (scene.facesData) {
        scene.facesData = scene.facesData.map((f) =>
          String(f.name) === String(oldName) ? { ...f, name: newName, confidence: 100 } : f
        )
      }

      await updateMetadata(scene)
      updatedScene.add(scene.id)

      processedVideos.add(scene.source)
    }

    // 2. Reimport all affected videos once
    for (const videoPath of processedVideos) {
      const video = await getByVideoSource(videoPath)
      if (video) {
        await importVideoFromVectorDb(video)
      }
    }

    // 3. Move folder old person name faces to the new name
    const oldPersonDir = path.join(FACES_DIR, oldName)
    const newPersonDir = path.join(FACES_DIR, newName)

    if (existsSync(oldPersonDir) && !existsSync(newPersonDir)) {
      await rename(oldPersonDir, newPersonDir)
    }

    // 4. Rebuild the faces for DeepFace
    await rebuildFacesCache()

    // 5. Rebuild the search suggestion cache
    await suggestionCache.refresh()

    return {
      updatedScene,
      processedVideos,
    }
  } catch (error) {
    logger.error({ error, data: job.data }, 'Error processing face renaming')
    throw error
  }
}

export const faceRenamingWorker = new Worker('face-renaming', processFaceRenamingJob, {
  connection,
  concurrency: 1,
})
