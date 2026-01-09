import type { Prisma, Project } from '@prisma/client'
import prisma from '../db'
import { nanoid } from 'nanoid'

type ProjectUpdateData = Partial<Omit<Project, 'videoPath' | 'userId' | 'folderId'>>

type ProjectCreateInput = Pick<Project, 'instructions' | 'userId' | 'isArchived' | 'name'> & {
  videoIds?: string[]
}

type ProjectUpdateInput = ProjectUpdateData & {
  videoIds?: string[]
}

export class ProjectModel {
  static async create(data: ProjectCreateInput) {
    const { videoIds, ...projectData } = data

    const project = await prisma.project.create({
      data: {
        id: nanoid(),
        ...projectData,
        ...(videoIds && videoIds.length > 0
          ? {
              videos: {
                connect: videoIds.map((id) => ({ id })),
              },
            }
          : {}),
      },
      include: {
        videos: {
          select: {
            id: true,
            name: true,
            duration: true,
            thumbnailUrl: true,
          },
        },
        _count: {
          select: {
            videos: true,
          },
        },
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
            id: true,
            name: true,
            duration: true,
            thumbnailUrl: true,
            source: true,
          },
        },
        _count: {
          select: {
            videos: true,
          },
        },
      },
    })
  }

  static async findById(id: string) {
    return prisma.project.findUnique({
      where: { id },
      include: {
        videos: {
          select: {
            id: true,
            name: true,
            duration: true,
            thumbnailUrl: true,
          },
        },
        _count: {
          select: {
            videos: true,
          },
        },
      },
    })
  }

  static async findFirst(options: Prisma.ProjectFindFirstArgs) {
    return prisma.project.findFirst(options)
  }

  static async findMany(options: Prisma.ProjectFindManyArgs) {
    return prisma.project.findMany(options)
  }

  static async update(id: string, data: ProjectUpdateInput) {
    const { videoIds, ...projectData } = data

    if (videoIds !== undefined) {
      // First, disconnect all existing videos
      await prisma.project.update({
        where: { id },
        data: {
          videos: {
            set: [],
          },
        },
      })

      // Then, connect the new videos
      const project = await prisma.project.update({
        where: { id },
        data: {
          ...projectData,
          videos: {
            connect: videoIds.map((videoId) => ({ id: videoId })),
          },
        },
        include: {
          videos: {
            select: {
              id: true,
            },
          },
          _count: {
            select: {
              videos: true,
            },
          },
        },
      })
      return project
    }

    // If no videoIds provided, just update the project data
    const project = await prisma.project.update({
      where: { id },
      data: projectData,
      include: {
        videos: {
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            videos: true,
          },
        },
      },
    })
    return project
  }

  static async addVideos(id: string, videoIds: string[]) {
    return prisma.project.update({
      where: { id },
      data: {
        videos: {
          connect: videoIds.map((videoId) => ({ id: videoId })),
        },
      },
      include: {
        videos: {
          select: {
            id: true,
            name: true,
            duration: true,
            thumbnailUrl: true,
          },
        },
        _count: {
          select: {
            videos: true,
          },
        },
      },
    })
  }

  static async removeVideos(id: string, videoIds: string[]) {
    return prisma.project.update({
      where: { id },
      data: {
        videos: {
          disconnect: videoIds.map((videoId) => ({ id: videoId })),
        },
      },
      include: {
        videos: {
          select: {
            id: true,
            name: true,
            duration: true,
            thumbnailUrl: true,
          },
        },
        _count: {
          select: {
            videos: true,
          },
        },
      },
    })
  }

  static async delete(id: string) {
    return prisma.project.delete({ where: { id } })
  }

  static async findManyByUserId(userId: string) {
    return prisma.project.findMany({
      where: { userId, isArchived: false },
      include: {
        videos: {
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            videos: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }
}
