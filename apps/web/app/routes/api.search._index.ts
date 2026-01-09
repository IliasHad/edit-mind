import type { LoaderFunctionArgs } from 'react-router'
import { getUser } from '~/services/user.sever'
import { searchScenes } from '@search/services'
import { logger } from '@shared/services/logger'
import { buildSearchQueryFromSuggestions } from '@search/services/suggestion'

export async function action({ request }: LoaderFunctionArgs) {
  const user = await getUser(request)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = parseInt(url.searchParams.get('limit') || '40', 10)
  const formData = await request.formData()
  const face = formData.get('face')?.toString() || ''
  const object = formData.get('object')?.toString() || ''
  const emotion = formData.get('emotion')?.toString() || ''
  const shotType = formData.get('shotType')?.toString() || ''
  const camera = formData.get('camera')?.toString() || ''
  const transcription = formData.get('transcription')?.toString() || ''
  const text = formData.get('text')?.toString() || ''
  const query = formData.get('query')?.toString() || ''
  const location = formData.get('location')?.toString() || ''

  try {
    const searchParams = buildSearchQueryFromSuggestions({
      face,
      object,
      emotion,
      shotType,
      camera,
      transcription,
      text,
      semanticQuery: query,
      location,
    })

    logger.debug(searchParams)

    const videos = await searchScenes(searchParams, undefined)
    const offset = (page - 1) * limit
    const paginatedVideos = videos.slice(offset, offset + limit)

    return {
      videos: paginatedVideos,
      total: videos.length,
      page,
      limit,
      query,
    }
  } catch (error) {
    logger.error(error)
    return new Response(JSON.stringify({ error: 'Failed to fetch search results' }), { status: 500 })
  }
}
