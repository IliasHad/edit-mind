import path from 'path'
import { logger } from '@shared/services/logger'
import { THUMBNAILS_DIR } from '@shared/constants'
import { generateVideoCover } from '@media-utils/utils/videos'
import { Video } from '@shared/types/video'
import { FolderModel, UserModel, VideoModel, generateId } from '@db/index'
import { Folder } from '@prisma/client'

export async function importVideoFromVectorDb(video: Video): Promise<Folder | undefined> {
  try {
    const user = await UserModel.findFirst()
    if (!user) {
      logger.error('No user found in database - cannot import videos')
      throw new Error('User not found')
    }

    try {
      if (!video.source) {
        logger.warn('Skipping video with missing source')
      }

      const duration = video.duration ? BigInt(Math.round(parseInt(video.duration.toString()))) : BigInt(0)
      const thumbnailPath = path.join(THUMBNAILS_DIR, `${path.basename(video.source)}_cover.jpg`)

      await generateVideoCover(video.source, thumbnailPath, { quality: '2', scale: '1280:-1', keyframe: 0 })

      let folder = await FolderModel.findByPath(path.dirname(video.source))
      if (!folder) {
        folder = await FolderModel.create({
          path: path.dirname(video.source),
          userId: user.id,
        })
      }

      await VideoModel.upsert({
        where: {
          source_userId: {
            source: video.source,
            userId: user.id,
          },
        },
        update: {
          thumbnailUrl: thumbnailPath,
          faces: video.faces || [],
          objects: video.objects || [],
          emotions: video.emotions || [],
          shotTypes: video.shotTypes || [],
          aspectRatio: video.aspectRatio,
          shottedAt: video.createdAt ? new Date(video.createdAt) : new Date(),
          updatedAt: new Date(),
        },
        create: {
          id: generateId(),
          source: video.source,
          userId: user.id,
          duration,
          name: path.basename(video.source),
          thumbnailUrl: thumbnailPath,
          faces: video.faces || [],
          objects: video.objects || [],
          emotions: video.emotions || [],
          shotTypes: video.shotTypes || [],
          shottedAt: video.createdAt ? new Date(video.createdAt) : new Date(),
          aspectRatio: video.aspectRatio,
          folderId: folder?.id,
        },
      })
      return folder
    } catch (videoError) {
      logger.error(`Failed to import video ${video.source}: ` + videoError)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Failed to import videos from vector database: ' + errorMessage)
    throw error
  }
}
