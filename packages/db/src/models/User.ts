import type { User, UserRole } from '@prisma/client'
import prisma from '../db'
import * as bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

type UserCreateData = Pick<User, 'password' | 'email' | 'role' | 'name'>

type UserUpdateData = Pick<User, 'password' | 'email'>

export class UserModel {
  static async create(data: UserCreateData) {
    const passwordHash = await bcrypt.hash(data.password, 10)
    const user = await prisma.user.create({
      data: {
        id: nanoid(),
        ...data,
        password: passwordHash,
      },
    })
    return user
  }

  static async findFirst() {
    return prisma.user.findFirst()
  }

  static async findByEmail(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    })
    return user
  }

  static async findById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    })
    return user
  }

  static async update(id: string, data: UserUpdateData) {
    const dataToUpdate: { name?: string; email?: string; password?: string; role?: UserRole } = data
    if (data.password) {
      dataToUpdate.password = await bcrypt.hash(data.password, 10)
    }

    const user: User = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    })
    return user
  }

  static async delete(id: string) {
    return prisma.user.delete({
      where: { id },
    })
  }
}
