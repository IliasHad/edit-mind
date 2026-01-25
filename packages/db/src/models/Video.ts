import type { Video, Prisma } from '@prisma/client'
import prisma from '../db'
import { nanoid } from 'nanoid'

type VideoUpdateData = Partial<Omit<Video, 'userId' | 'folderId'>>

type VideoCreateInput = Pick<
  Video,
  | 'source'
  | 'userId'
  | 'folderId'
  | 'shottedAt'
  | 'thumbnailUrl'
  | 'name'
  | 'duration'
  | 'faces'
  | 'emotions'
  | 'aspectRatio'
  | 'objects'
  | 'shotTypes'
>

export class VideoModel {
  static async create(data: VideoCreateInput) {
    const video = await prisma.video.create({
      data: {
        id: nanoid(),
        ...data,
        faces: data.faces ?? undefined,
        emotions: data.emotions ?? undefined,
        shotTypes: data.shotTypes ?? undefined,
        objects: data.objects ?? undefined,
      },
    })
    return video
  }

  static async findById(id: string) {
    return prisma.video.findUnique({ where: { id } })
  }

  static async findMany(options: Prisma.VideoFindManyArgs) {
    return prisma.video.findMany(options)
  }

  static async count(options: Prisma.VideoCountArgs) {
    return prisma.video.count(options)
  }
  static async upsert(options: Prisma.VideoUpsertArgs) {
    return prisma.video.upsert(options)
  }
  static async findFirst(options: Prisma.VideoFindFirstArgs) {
    return prisma.video.findFirst(options)
  }

  static async update(id: string, data: VideoUpdateData) {
    const video: Video = await prisma.video.update({
      where: { id },
      data: {
        ...data,
        faces: data.faces ?? undefined,
        emotions: data.emotions ?? undefined,
        shotTypes: data.shotTypes ?? undefined,
        objects: data.objects ?? undefined,
      },
    })
    return video
  }
  static async updateBySource(source: string, userId: string, data: VideoUpdateData) {
    const video: Video = await prisma.video.update({
      where: {
        source_userId: {
          source,
          userId,
        },
      },
      data: {
        ...data,
        faces: data.faces ?? undefined,
        emotions: data.emotions ?? undefined,
        shotTypes: data.shotTypes ?? undefined,
        objects: data.objects ?? undefined,
      },
    })
    return video
  }

  static async delete(id: string) {
    return prisma.video.delete({ where: { id } })
  }
}
