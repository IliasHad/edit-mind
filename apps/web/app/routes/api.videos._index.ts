import { VideoModel } from '@db/index'
import { logger } from '@shared/services/logger'
import type { LoaderFunctionArgs } from 'react-router'
import { requireUserId } from '~/services/user.server'

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const userId = await requireUserId(request)
    const url = new URL(request.url)

    const page = parseInt(url.searchParams.get('page') || '0')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const search = url.searchParams.get('search') || ''

    const skip = page * limit

    const [videos, totalCount] = await Promise.all([
      VideoModel.findMany({
        where: {
          userId,
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { folder: { path: { contains: search, mode: 'insensitive' } } },
          ],
        },
        orderBy: { shottedAt: 'desc' },
        skip,
        take: limit,
        include: {
          folder: {
            select: {
              path: true,
            },
          },
        },
      }),
      VideoModel.count({
        where: {
          userId,
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { folder: { path: { contains: search, mode: 'insensitive' } } },
          ],
        },
      }),
    ])

    const hasMore = skip + videos.length < totalCount
    const totalPages = Math.ceil(totalCount / limit)

    return {
      videos: videos.map((video) => ({
        ...video,
        duration: parseInt(video.duration.toString()),
      })),
      hasMore,
      totalPages,
      page,
      limit
    }
  } catch (error) {
    logger.error('Error fetching videos: ' + error)
    return new Response(JSON.stringify({ error: 'Failed to fetch videos' }), { status: 500 })
  }
}
