import { logger } from '@shared/services/logger'
import { getAllKnownFaces } from '@shared/utils/faces'
import type { LoaderFunctionArgs } from 'react-router'

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '40', 10)

    const result = await getAllKnownFaces()
    if (result) {
      const faces = Object.entries(result).map(([name, images]) => ({
        name,
        images,
      }))

      const offset = (page - 1) * limit
      const totalPages = Math.ceil(faces.length / limit)
      const hasMore = page < totalPages

      return {
        total: faces.length,
        page,
        limit,
        faces: faces.slice(offset, offset + limit),
        totalPages,
        hasMore,
      }
    }
    throw new Error('Error loading faces')
  } catch (error) {
    logger.error(error)
    return {
      faces: [],
      total: 0,
      page: 1,
      limit: 40,
      hasMore: false,
      totalPages: 1,
    }
  }
}
