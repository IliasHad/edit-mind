import { JobModel } from '@db/index'
import { logger } from '@shared/services/logger'
import type { LoaderFunctionArgs } from 'react-router'
import { requireUserId } from '~/services/user.sever'

export async function loader({ request, params }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = parseInt(url.searchParams.get('limit') || '20', 10)
  const { id } = params

  try {
    const userId = await requireUserId(request)

    const offset = (page - 1) * limit

    const jobs = await JobModel.findMany({
      where: { userId: userId, folderId: id },
      orderBy: { updatedAt: 'desc' },
      omit: {
        fileSize: true,
      },
      skip: offset,
      take: limit,
    })

    const allJobs = await JobModel.findMany({
      where: { userId: userId, folderId: id },
      select: {
        status: true,
      },
    })

    const total = allJobs.length
    const totalPages = Math.ceil(total / limit)
    const hasMore = page < totalPages

    const jobsStatus = allJobs.reduce((acc: Record<string, number>, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1
      return acc
    }, {})

    return {
      jobs,
      page,
      total,
      limit,
      hasMore,
      totalPages,
      jobsStatus,
    }
  } catch (error) {
    logger.error('Error fetching jobs: ' + error)
    return {
      jobs: [],
      page,
      total: 0,
      limit,
      hasMore: false,
      totalPages: 1,
      jobsStatus: {},
    }
  }
}
