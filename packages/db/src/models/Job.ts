import type { Job, Prisma } from '@prisma/client'
import prisma from '../db'
import { nanoid } from 'nanoid'

type JobUpdateData = Partial<Omit<Job, 'videoPath' | 'userId' | 'folderId'>>

type JobCreateInput = Pick<Job, 'videoPath' | 'userId' | 'folderId' | 'fileSize'>

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
  static async aggregate(options: Prisma.JobAggregateArgs) {
    return prisma.job.aggregate(options)
  }

  static async update(id: string, data: JobUpdateData) {
    const job: Job = await prisma.job.update({
      where: { id },
      data: {
        ...data,
        frameAnalysisPlugins: data.frameAnalysisPlugins ?? undefined,
        frameAnalysisStages: data.frameAnalysisStages ?? undefined
      },
    })
    return job
  }
  static async updateMany(options: Prisma.JobUpdateManyArgs) {
    return prisma.job.updateMany(options)
  }

  static async findMany(options: Prisma.JobFindManyArgs) {
    return prisma.job.findMany(options)
  }

  static async count(options: Prisma.JobCountArgs) {
    return prisma.job.count(options)
  }
  static async findFirst(options: Prisma.JobFindFirstArgs) {
    return prisma.job.findFirst(options)
  }

  static async delete(id: string) {
    return prisma.job.delete({ where: { id } })
  }

  static async deleteMany(options: Prisma.JobDeleteManyArgs) {
    return prisma.job.deleteMany(options)
  }
}
