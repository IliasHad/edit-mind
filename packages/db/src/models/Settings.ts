import type { Settings } from '@prisma/client'
import prisma from '../db'
import { nanoid } from 'nanoid'

type SettingsUpdateData = Partial<Omit<Settings, 'userId'>>

type SettingsCreateInput = Pick<Settings, 'notifyOnJobComplete' | 'notifyOnErrors' | 'primaryFaceLabel' | 'userId'>

export class SettingsModel {
  static async create(data: SettingsCreateInput) {
    const settings = await prisma.settings.create({
      data: {
        id: nanoid(),
        ...data,
      },
    })
    return settings
  }

  static async findByUserId(userId: string) {
    const settings = await prisma.settings.findUnique({
      where: { userId },
    })
    return settings
  }

  static async update(userId: string, data: SettingsUpdateData) {
    const settings: Settings = await prisma.settings.update({
      where: { userId },
      data,
    })
    return settings
  }

  static async delete(userId: string) {
    return prisma.settings.delete({
      where: { userId },
    })
  }
}
