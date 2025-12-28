import type { Export } from '@prisma/client'
import prisma from '../db'
import { nanoid } from 'nanoid'

type ExportUpdateData = Partial<Omit<Export, 'id' | 'userId'>>

type ExportCreateInput = Pick<Export, 'userId' | 'sceneIds' | 'name' | 'status'>

export class ExportModel {
  static async create(data: ExportCreateInput) {
    const exportItem = await prisma.export.create({
      data: {
        id: nanoid(),
        ...data,
      },
    })
    return exportItem
  }

  static async findById(id: string) {
    return prisma.export.findUnique({ where: { id } })
  }

  static async update(id: string, data: ExportUpdateData) {
    const exportItem: Export = await prisma.export.update({
      where: { id },
      data,
    })
    return exportItem
  }

  static async delete(id: string) {
    return prisma.export.delete({ where: { id } })
  }
}
