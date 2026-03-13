import type { Folder, Prisma } from '@prisma/client'
import prisma from '../db'
import { nanoid } from 'nanoid'
import { EXCLUDED_VIDEO_PATTERNS, SUPPORTED_VIDEO_PATTERNS } from '@shared/constants/video'

type FolderUpdateData = Partial<Omit<Folder, 'id' | 'userId'>>

type FolderCreateInput = Pick<Folder, 'userId' | 'path' | 'watcherEnabled' | 'excludePatterns' | 'includePatterns'>

export class FolderModel {
  static async create(data: FolderCreateInput) {
    const folder = await prisma.folder.create({
      data: {
        id: nanoid(),
        ...data,
        excludePatterns: data.excludePatterns ?? EXCLUDED_VIDEO_PATTERNS,
        includePatterns: data.excludePatterns ?? SUPPORTED_VIDEO_PATTERNS
      },
    })
    return folder
  }

  static async findById(id: string) {
    return prisma.folder.findUnique({ where: { id } })
  }

  static async findByPath(path: string) {
    return prisma.folder.findUnique({ where: { path } })
  }

  static async findMany(options: Prisma.FolderFindManyArgs) {
    return prisma.folder.findMany(options)
  }
  static async findUnique(options: Prisma.FolderFindUniqueArgs) {
    return prisma.folder.findUnique(options)
  }
  static async update(id: string, data: FolderUpdateData) {
    const folder = await prisma.folder.update({
      where: { id },
      data,
    })
    return folder
  }
  static async updateByPath(path: string, data: FolderUpdateData) {
    const folder = await prisma.folder.update({
      where: { path },
      data,
    })
    return folder
  }

  static async delete(id: string) {
    return prisma.folder.delete({ where: { id } })
  }
}
