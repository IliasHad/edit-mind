import type { Video, Prisma } from '@prisma/client'
import prisma from '../db'
import { nanoid } from 'nanoid'

type VideoUpdateData = Partial<Omit<Video, 'userId' | 'source' | 'folderId'>>

type VideoCreateInput = Pick<Video, 'source' | 'userId' | 'folderId' | 'shottedAt' | 'thumbnailUrl' | 'name'>

export class VideoModel {
  static async create(data: VideoCreateInput) {
    const video = await prisma.video.create({
      data: {
        id: nanoid(),
        ...data,
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

  static async delete(id: string) {
    return prisma.video.delete({ where: { id } })
  }
}
