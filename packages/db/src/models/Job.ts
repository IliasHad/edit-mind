import type { Job } from '@prisma/client'
import prisma from '../db'
import { nanoid } from 'nanoid'

type JobUpdateData = Partial<Omit<Job, 'videoPath' | 'userId' | 'folderId'>>

type JobCreateInput = Pick<Job, 'videoPath' | 'userId' | 'folderId'>

export class JobModel {
  static async create(data: JobCreateInput) {
    const job = await prisma.job.create({
      data: {
        id: nanoid(),
        ...data,
      },
    })
    return job
  }

  static async findById(id: string) {
    return prisma.job.findUnique({ where: { id } })
  }

  static async update(id: string, data: JobUpdateData) {
    const job: Job = await prisma.job.update({
      where: { id },
      data: {
        ...data,
        frameAnalysisPlugins: data.frameAnalysisPlugins ?? undefined,
      },
    })
    return job
  }

  static async delete(id: string) {
    return prisma.job.delete({ where: { id } })
  }
}
