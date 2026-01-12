import { logger } from '@shared/services/logger'
import type { LoaderFunctionArgs } from 'react-router'
import { prisma } from '~/services/database'
import { requireUser } from '~/services/user.sever'

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    await requireUser(request)

    const uniqueVideos = new Map<string, number>()
    const collections = await prisma.collection.findMany({
      orderBy: {
        name: 'asc',
      },
      include: {
        items: {
          select: {
            video: {
              select: {
                duration: true,
                source: true,
              },
            },
          },
        },
      },
    })

    for (const item of collections.flatMap((collection) => collection.items)) {
      if (!uniqueVideos.has(item.video.source)) {
        uniqueVideos.set(item.video.source, parseInt(item.video.duration.toString()))
      }
    }

    const totalVideos = uniqueVideos.size
    const totalDuration = Array.from(uniqueVideos.values()).reduce((a, b) => a + b, 0)

    return {
      totalDuration,
      totalVideos,
      collections: collections.map((collection) => ({
        ...collection,
        totalDuration: collection.totalDuration.toString(),
        items: collection.items.map((item) => ({
          ...item,
          video: {
            ...item.video,
            duration: item.video.duration.toString(),
          },
        })),
      })),
    }
  } catch (error) {
    logger.error('Error fetching collections: ' + error)
    return new Response(JSON.stringify({ error: 'Failed to fetch collections' }), { status: 500 })
  }
}
