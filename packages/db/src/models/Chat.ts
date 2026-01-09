import type { Chat, Prisma } from '@prisma/client'
import prisma from '../db'
import { nanoid } from 'nanoid'

type ChatUpdateData = Partial<Omit<Chat, 'id' | 'userId'>>

type ChatCreateData = Pick<Chat, 'userId' | 'projectId' | 'title'>

export class ChatModel {
  static async create({ userId, ...restData }: ChatCreateData) {
    const chat = await prisma.chat.create({
      data: {
        id: nanoid(),
        userId,
        ...restData,
      },
    })
    return chat
  }

  static async findFirst(options: Prisma.ChatFindFirstArgs) {
    return prisma.chat.findFirst(options)
  }

  static async findMany(options: Prisma.ChatFindManyArgs) {
    return prisma.chat.findMany(options)
  }
  static async count(options: Prisma.ChatCountArgs) {
    return prisma.chat.count(options)
  }

  static async findById(id: string) {
    return prisma.chat.findUnique({ where: { id } })
  }

  static async update(id: string, data: ChatUpdateData) {
    const chat: Chat = await prisma.chat.update({
      where: { id },
      data,
    })
    return chat
  }

  static async delete(id: string) {
    return prisma.chat.delete({ where: { id } })
  }
}
