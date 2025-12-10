import type { FaceDetectionData } from '@shared/types/unknownFace'
import { promises as fs } from 'fs'
import { existsSync } from 'fs'
import path from 'path'
import type { ActionFunctionArgs } from 'react-router'
import type { Scene } from '@shared/types/scene'
import { FACES_DIR, PROCESSED_VIDEOS_DIR, UNKNOWN_FACES_DIR } from '@shared/constants'
import { getByVideoSource, updateMetadata } from '@shared/services/vectorDb'

interface LabelFaceRequest {
  jsonFile: string
  faceId: string
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return { success: false, error: 'Method not allowed' }
  }

  const { faces, name } = (await request.json()) as {
    faces: LabelFaceRequest[]
    name: string
  }

  if (!faces?.length) return { success: false, error: 'No faces provided' }
  if (!name?.trim()) return { success: false, error: 'Name is required' }

  const personDir = path.join(FACES_DIR, name)
  if (!existsSync(personDir)) {
    await fs.mkdir(personDir, { recursive: true })
  }

  let labeledCount = 0
  let failedCount = 0
  const errors: string[] = []

  for (const face of faces) {
    try {
      const jsonPath = path.join(UNKNOWN_FACES_DIR, face.jsonFile)

      if (existsSync(jsonPath)) {
        const faceData: FaceDetectionData = JSON.parse(await fs.readFile(jsonPath, 'utf8'))

        const imageFile = faceData.image_file
        const srcImagePath = path.join(UNKNOWN_FACES_DIR, imageFile)
        const destImagePath = path.join(personDir, imageFile)

        const scenes = await getByVideoSource(faceData.video_path)
        const sortedAppearances = faceData.all_appearances?.sort((a, b) => a.frame_index - b.frame_index)

        if (sortedAppearances) {
          const firstAppearance = sortedAppearances[0]
          const lastAppearance = sortedAppearances[sortedAppearances.length - 1]

          for (const scene of scenes) {
            // Check if the face appears at any point during the scene
            const overlapsScene =
              firstAppearance.timestamp_seconds <= scene.endTime && lastAppearance.timestamp_seconds >= scene.startTime

            if (!overlapsScene) continue

            if (scene.faces.includes(face.faceId)) {
              scene.faces = scene.faces.map((f) => (f === face.faceId ? name : f))
            }

            if (scene.facesData) {
              scene.facesData = scene.facesData.map((f) => (f.name === face.faceId ? { ...f, name } : f))
            }

            labeledCount++
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

              if (scene.faces.includes(face.faceId)) {
                scene.faces = scene.faces.map((f) => (f === face.faceId ? name : f))
                sceneModified = true
              }

              if (scene.facesData) {
                const hadFace = scene.facesData.some((f) => f.name === face.faceId)
                scene.facesData = scene.facesData.map((f) => (f.name === face.faceId ? { ...f, name } : f))
                if (hadFace) sceneModified = true
              }

              if (sceneModified) modified = true
            }

            if (modified) {
              await fs.writeFile(scenesJsonPath, JSON.stringify(fileScenes, null, 2), 'utf8')
            }
          }
        }
        if (existsSync(srcImagePath)) {
          await fs.copyFile(srcImagePath, destImagePath)
          await fs.unlink(srcImagePath)
        }

        await fs.unlink(jsonPath)
      } else {
        const imageFile = face.jsonFile.replace('.json', '.jpg')
        const srcImagePath = path.join(UNKNOWN_FACES_DIR, imageFile)
        await fs.unlink(srcImagePath)
      }
    } catch (err) {
      console.error('Label error:', err)
      failedCount++
      errors.push(`Failed to label face ${face.faceId}`)
    }
  }

  return {
    success: true,
    labeledCount,
    failedCount,
    errors: errors.length ? errors : undefined,
  }
}
