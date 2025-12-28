import type { Folder } from '@prisma/client';
import prisma from '../db'
import { nanoid } from 'nanoid'

type FolderUpdateData = Partial<Omit<Folder, 'id' | 'userId'>>

type FolderCreateInput = Pick<Folder, 'userId' | 'path'>

export class FolderModel {
  static async create(data: FolderCreateInput) {
    const folder = await prisma.folder.create({
      data: {
        id: nanoid(),
        ...data,
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

  static async update(id: string,data: FolderUpdateData) {
    const folder: Folder = await prisma.folder.update({
      where: { id },
      data,
    })
    return folder
  }
  static async updateByPath({ path, ...restData }: FolderUpdateData) {
    const folder: Folder = await prisma.folder.update({
      where: { path },
      data: restData,
    })
    return folder
  }

  static async delete(id: string) {
    return prisma.folder.delete({ where: { id } })
  }
}
