import type { ChatMessage, MessageIntent, MessageStage, Sender, Prisma } from '@prisma/client'
import prisma from '../db'
import { nanoid } from 'nanoid'

type ChatMessageUpdateData = Partial<Omit<ChatMessage, 'id' | 'userId'>>

type ChatMessageCreateData = {
  chatId: string
  sender: Sender
  text: string
  isThinking?: boolean
  stage?: MessageStage
  stitchedVideoPath?: string | null
  intent?: MessageIntent
  isError?: boolean
}

export class ChatMessageModel {
  static async create(data: ChatMessageCreateData) {
    const chatMessage = await prisma.chatMessage.create({
      data: {
        id: nanoid(),
        ...data,
      },
    })
    return chatMessage
  }

  static async findFirst(options: Prisma.ChatMessageFindFirstArgs) {
    return prisma.chatMessage.findFirst(options)
  }

  static async findById(id: string) {
    return prisma.chatMessage.findUnique({ where: { id } })
  }

  static async findManyByChatId(chatId: string) {
    return prisma.chatMessage.findMany({ where: { chatId } })
  }

  static async update(id: string, data: ChatMessageUpdateData) {
    const chatMessage: ChatMessage = await prisma.chatMessage.update({
      where: { id },
      data,
    })
    return chatMessage
  }

  static async delete(id: string) {
    return prisma.chatMessage.delete({ where: { id } })
  }
}
