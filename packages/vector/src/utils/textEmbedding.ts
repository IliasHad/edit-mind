import { createHash } from 'crypto'
import { Scene } from '@shared/types/scene'
import {
  generateAllThumbnails,
  getCameraNameAndDate,
  getLocationFromVideo,
  getVideoMetadata,
} from '@media-utils/utils/videos'
import fs from 'fs/promises'
import path from 'path'
import { createVectorDbClient, embedDocuments } from '../services/vectorDb'
import { existsSync } from 'fs'
import { formatLocation } from '@shared/utils/location'

import { EMBEDDING_BATCH_SIZE, THUMBNAILS_DIR } from '../constants'
import { extractGPS, getGoProDeviceName, getGoProVideoMetadata } from '@media-utils/lib/gopro'
import { logger } from '@shared/services/logger'
import { GoProMetadataWithStreams } from '@media-utils/types/gopro'
import { sceneToVectorFormat, gcd } from './shared'

export const embedScenes = async (scenes: Scene[], videoFullPath: string, category?: string): Promise<void> => {
  const metadata = await getVideoMetadata(videoFullPath)

  const duration = metadata.duration
  const { latitude, longitude, altitude } = await getLocationFromVideo(videoFullPath)
  let location = formatLocation(latitude, longitude, altitude)

  const { camera, createdAt } = await getCameraNameAndDate(videoFullPath)
  const aspectRatio =
    metadata?.displayAspectRatio ||
    (metadata?.width && metadata?.height
      ? (() => {
          const divisor = gcd(metadata.width, metadata.height)
          return `${metadata.width / divisor}:${metadata.height / divisor}`
        })()
      : 'N/A')

  let initialCamera = camera
  if (initialCamera.toLocaleLowerCase().includes('gopro')) {
    const goproTelemetry = await getGoProVideoMetadata(videoFullPath)
    if (goproTelemetry) {
      initialCamera = getGoProDeviceName(goproTelemetry)

      const streamData = goproTelemetry['1']
      const gpsCoordinates = extractGPS(streamData as GoProMetadataWithStreams)
      if (gpsCoordinates.length > 0) {
        location = formatLocation(gpsCoordinates[0]?.lat, gpsCoordinates[0]?.lon, gpsCoordinates[0]?.alt)
      } else {
        logger.warn(`No GPS data found in GoPro video: ${videoFullPath}`)
      }
    }
  }

  await fs.mkdir(THUMBNAILS_DIR, { recursive: true })

  try {
    for (let i = 0; i < scenes.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = scenes.slice(i, i + EMBEDDING_BATCH_SIZE)

      const scenesData = batch.map((scene) => {
        const hash = createHash('sha256').update(`${videoFullPath}_${scene.startTime}`).digest('hex')
        const thumbnailFile = `${hash}.jpg`
        const thumbnailPath = path.join(THUMBNAILS_DIR, thumbnailFile)

        scene.thumbnailUrl = thumbnailPath

        return {
          scene,
          thumbnailPath,
          exists: existsSync(thumbnailPath),
        }
      })

      const missing = scenesData.filter((s) => !s.exists)
      if (missing.length > 0) {
        await generateAllThumbnails(
          videoFullPath,
          missing.map((s) => s.scene.startTime),
          missing.map((s) => s.thumbnailPath)
        )
      }

      const embeddingInputsPromise = batch.map(async (scene) => {
        scene.camera = initialCamera
        scene.createdAt = new Date(createdAt).getTime()
        scene.location = location
        if (!scene.aspect_ratio) {
          scene.aspect_ratio = aspectRatio
        }
        scene.category = category
        scene.duration = duration
        return await sceneToVectorFormat(scene)
      })
      const embeddingInputs = await Promise.all(embeddingInputsPromise)
      const { collection } = await createVectorDbClient()
      const existingIds = await collection?.get({
        ids: embeddingInputs.map((e) => e.id),
        include: [],
      })

      const newDocs = embeddingInputs.filter((doc) => !existingIds?.ids.includes(doc.id))

      if (newDocs.length > 0) {
        await embedDocuments(
          newDocs.map((doc) => ({
            id: doc.id,
            metadata: doc.metadata,
            text: doc.text,
          }))
        )
      }
    }
  } catch (err) {
    logger.error(err)
  }
}
