import type { CollectionItem,Prisma } from '@prisma/client'
import prisma from '../db'
import { nanoid } from 'nanoid'

type CollectionItemUpdateData = Partial<Omit<CollectionItem, 'id' | 'userId'>>

type CollectionItemCreateInput = Pick<CollectionItem, 'videoId' | 'confidence' | 'collectionId'>

export class CollectionItemModel {
  static async create(data: CollectionItemCreateInput) {
    const collectionItem = await prisma.collectionItem.create({
      data: {
        id: nanoid(),
        ...data,
      },
    })
    return collectionItem
  }

  static async findById(id: string) {
    return prisma.collectionItem.findUnique({ where: { id } })
  }

  static async upsert(options: Prisma.CollectionItemUpsertArgs) {
    return prisma.collectionItem.upsert(options)
  }

  static async count(collectionId: string) {
    return prisma.collectionItem.count({
      where: {
        collectionId,
      },
    })
  }

  static async findManyAndVideos(collectionId: string) {
    return prisma.collectionItem.findMany({
      where: {
        collectionId,
      },
      include: { video: true },
    })
  }

  static async update(id: string, data: CollectionItemUpdateData) {
    const collectionItem: CollectionItem = await prisma.collectionItem.update({
      where: { id },
      data,
    })
    return collectionItem
  }

  static async delete(id: string) {
    return prisma.collectionItem.delete({ where: { id } })
  }
}
