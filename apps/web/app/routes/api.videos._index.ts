import { VideoModel } from '@db/index'
import { logger } from '@shared/services/logger'
import type { LoaderFunctionArgs } from 'react-router'
import { requireUserId } from '~/services/user.sever'

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const userId = await requireUserId(request)

    const videos = await VideoModel.findMany({
      where: { userId: userId },
      orderBy: { shottedAt: 'desc' },
      include: {
        folder: {
          select: {
            path: true,
          },
        },
      },
    })

    return {
      videos: videos.map((video) => ({
        ...video,
        duration: parseInt(video.duration.toString()),
      })),
    }
  } catch (error) {
    logger.error('Error fetching videos: ' + error)
    return new Response(JSON.stringify({ error: 'Failed to fetch videos' }), { status: 500 })
  }
}
