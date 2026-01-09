import { logger } from '@shared/services/logger'
import { type LoaderFunctionArgs } from 'react-router'
import { prisma } from '~/services/database'

export async function loader({ params }: LoaderFunctionArgs) {
  try {
    const { id } = params

    const collection = await prisma.collection.findFirst({
      where: { id },
      include: {
        items: {
          include: {
            video: true
          },
        },
      },
    })

    if (!collection) {
      throw new Response('Collection not found', { status: 404 })
    }

    return {
      collection: {
        ...collection,
        totalDuration: collection.totalDuration.toString(),
        items: collection.items.map((item) => ({
          ...item,
          video: {
            ...item.video,
            duration: item.video.duration.toString(),
          },
        })),
      },
    }
  } catch (error) {
    logger.error('Error fetching collection details: ' + error)
    return new Response(JSON.stringify({ error: 'Failed to fetch collection details' }), { status: 500 })
  }
}
