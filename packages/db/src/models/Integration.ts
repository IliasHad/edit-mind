import type { Integration, Prisma } from '@prisma/client'
import prisma from '../db'
import { nanoid } from 'nanoid'

type IntegrationUpdateData = Partial<Omit<Integration, 'id' | 'userId'>>

type IntegrationCreateData = Pick<Integration, 'type' | 'userId'>

export class IntegrationModel {
  static async create(data: IntegrationCreateData) {
    const integration = await prisma.integration.create({
      data: {
        id: nanoid(),
        ...data,
      },
    })
    return integration
  }

  static async findById(id: string) {
    return prisma.integration.findUnique({ where: { id } })
  }

  static async findByUserId(userId: string) {
    return prisma.integration.findFirst({ where: { userId } })
  }

  static async findUnique(options: Prisma.IntegrationFindUniqueArgs) {
    return prisma.integration.findUnique(options)
  }
  static async update(id: string, data: IntegrationUpdateData) {
    const integration: Integration = await prisma.integration.update({
      where: { id },
      data: {
        ...data,
        config: data.config ?? undefined,
      },
    })
    return integration
  }

  static async upsert(userId: string, options: IntegrationCreateData) {
    const integration = await prisma.integration.findFirst({ where: { userId } })
    return await prisma.integration.upsert({
      where: {
        userId,
        id: integration?.id,
      },
      create: {
        ...options,
        id: nanoid(),
      },
      update: {
        ...options,
        updatedAt: new Date(),
      },
    })
  }

  static async delete(id: string) {
    return prisma.integration.delete({ where: { id } })
  }
}
