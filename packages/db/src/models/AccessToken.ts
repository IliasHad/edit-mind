import type { AccessToken, AccessTokenScope } from '@prisma/client'
import prisma from '../db'
import { nanoid } from 'nanoid'

export class AccessTokenModel {
  static async findByHash(tokenHash: string): Promise<AccessToken | null> {
    return prisma.accessToken.findUnique({ where: { tokenHash } })
  }

  static async create(data: {
    name: string
    tokenHash: string
    userId: string
    description?: string
    scopes?: AccessTokenScope[]
    expiresAt?: Date
    allowedIps?: string[]
  }) {
    return prisma.accessToken.create({
      data: {
        id: nanoid(),
        ...data,
      },
    })
  }

  static async updateLastUsed(id: string, ip: string, userAgent?: string): Promise<void> {
    await prisma.accessToken.update({
      where: { id },
      data: {
        lastUsedAt: new Date(),
        lastUsedIp: ip,
        lastUsedUserAgent: userAgent,
      },
    })
  }

  static async findByUserId(userId: string) {
    return prisma.accessToken.findMany({ where: { userId } })
  }

  static async deleteByOwner(id: string, userId: string) {
    return prisma.accessToken.deleteMany({ where: { id, userId } })
  }
}
