import { CollectionModel, CollectionItemModel } from '@db/index'
import { logger } from '@shared/services/logger'
import { type LoaderFunctionArgs } from 'react-router'
import type { SortOption, SortOrder } from '~/features/videos/types'

export async function loader({ params, request }: LoaderFunctionArgs) {
  try {
    const { id } = params
    const url = new URL(request.url)
    const sortBy = (url.searchParams.get('sortBy') || 'shottedAt') as SortOption
    const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as SortOrder

    const collection = await CollectionModel.findUnique({
      where: { id },
    })

    if (!collection) {
      return new Response(JSON.stringify({ error: 'Collection not found' }), { status: 404 })
    }

    const orderBy = {
      video: {
        [sortBy]: sortOrder,
      },
    }

    const items = await CollectionItemModel.findMany({
      where: {
        collectionId: id,
      },
      orderBy,
      include: {
        video: true,
      },
    })

    return {
      collection: {
        ...collection,
        totalDuration: Number(collection.totalDuration),
        items: items.map((item) => ({
          ...item,
          video: {
            ...item.video,
            duration: Number(item.video.duration),
          },
        })),
      },
    }
  } catch (error) {
    logger.error('Error fetching collection details: ' + error)
    return new Response(JSON.stringify({ error: 'Failed to fetch collection details' }), { status: 500 })
  }
}
