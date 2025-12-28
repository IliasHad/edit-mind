import type { Project } from '@prisma/client'
import prisma from '../db'
import { nanoid } from 'nanoid'

type ProjectUpdateData = Partial<Omit<Project, 'videoPath' | 'userId' | 'folderId'>>

type ProjectCreateInput = Pick<Project, 'instructions' | 'userId' | 'isArchived' | 'name'>

export class ProjectModel {
  static async create(data: ProjectCreateInput) {
    const project = await prisma.project.create({
      data: {
        id: nanoid(),
        ...data,
      },
    })
    return project
  }

  static async findByIdWithVideos(id: string) {
    return prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        instructions: true,
        isArchived: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        videos: {
          select: {
            source: true,
          },
        },
      },
    })
  }

  static async findById(id: string) {
    return prisma.project.findUnique({ where: { id } })
  }

  static async update(id: string, data: ProjectUpdateData) {
    const project: Project = await prisma.project.update({
      where: { id },
      data,
    })
    return project
  }

  static async delete(id: string) {
    return prisma.project.delete({ where: { id } })
  }
}
