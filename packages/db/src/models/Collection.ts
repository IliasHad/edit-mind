import type { Collection } from '@prisma/client'
import prisma from '../db'
import { nanoid } from 'nanoid'

type CollectionUpdateData = Partial<Omit<Collection, 'id' | 'userId'>>

type CollectionCreateInput = Pick<
  Collection,
  'name' | 'userId' | 'type' | 'description' | 'isAutoPopulated' | 'autoUpdateEnabled'
>

export class CollectionModel {
  static async create(data: CollectionCreateInput) {
    const collection = await prisma.collection.create({
      data: {
        id: nanoid(),
        ...data,
      },
    })
    return collection
  }

  static async findById(id: string) {
    return prisma.collection.findUnique({ where: { id } })
  }

  static async findByNameAndUser(name: string, userId: string) {
    return prisma.collection.findFirst({ where: { name, userId } })
  }

  static async update(id: string, data: CollectionUpdateData) {
    const collection: Collection = await prisma.collection.update({
      where: { id },
      data: {
        ...data,
        filters: data.filters ?? undefined,
      },
    })
    return collection
  }

  static async delete(id: string) {
    return prisma.collection.delete({ where: { id } })
  }
}
