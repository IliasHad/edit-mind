import type { Collection, Prisma } from '@prisma/client'
import prisma from '../db'
import { nanoid } from 'nanoid'

type CollectionUpdateData = Partial<Omit<Collection, 'id' | 'userId'>>

type CollectionCreateInput = Pick<
  Collection,
  'name' | 'userId' | 'type' | 'description' | 'isAutoPopulated' | 'autoUpdateEnabled' | 'thumbnailUrl' | 'itemCount' | 'totalDuration'
>

type CollectionUpsertInput = {
  where: Prisma.CollectionWhereUniqueInput
  create: CollectionCreateInput
  update: Prisma.CollectionUpdateInput
}
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
  static async findMany(options: Prisma.CollectionFindManyArgs) {
    return prisma.collection.findMany(options)
  }
    static async findUnique(options: Prisma.CollectionFindUniqueArgs) {
    return prisma.collection.findUnique(options)
  }

  static async findByNameAndUser(name: string, userId: string) {
    return prisma.collection.findFirst({ where: { name, userId } })
  }

  static async upsert(options: CollectionUpsertInput) {
    return prisma.collection.upsert({
      ...options,
      create: {
        id: nanoid(),
        ...options.create,
      },
    })
  }

  static async update(id: string, data: CollectionUpdateData) {
    const collection: Collection = await prisma.collection.update({
      where: { id },
      data: {
        ...data,
      },
    })
    return collection
  }

  static async delete(id: string) {
    return prisma.collection.delete({ where: { id } })
  }
  static async deleteMany(options: Prisma.CollectionDeleteManyArgs) {
    return prisma.collection.deleteMany(options)
  }
}
