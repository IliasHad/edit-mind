import type { LoaderFunctionArgs } from 'react-router'
import { getUser } from '~/services/user.server'
import { searchScenes } from '@search/services'
import { logger } from '@shared/services/logger'
import { buildSearchQueryFromSuggestions } from '@search/services/suggestion'
import { normalizeLocalizedSearchQuery } from '@search/utils/localizedQuery'
import { AppSettingsModel } from '@db/index'
import { SearchTextSchema } from '~/features/search/schemas'

export async function action({ request }: LoaderFunctionArgs) {
  const user = await getUser(request)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const url = new URL(request.url)

  try {
    const formData = await request.formData()
    const page = parseInt(formData.get('page')?.toString() || url.searchParams.get('page') || '1', 10)
    const limit = parseInt(formData.get('limit')?.toString() || url.searchParams.get('limit') || '40', 10)
    const { data, success } = SearchTextSchema.safeParse(Object.fromEntries(formData))

    if (!success) {
      return new Response(JSON.stringify({ error: 'Search input invalid' }), { status: 400 })
    }

    const language = await AppSettingsModel.getLanguage()
    const searchParams = normalizeLocalizedSearchQuery(
      { ...buildSearchQueryFromSuggestions(data), semanticQuery: data.query ?? null },
      language
    )

    const videos = await searchScenes(searchParams, undefined, true)
    const offset = (page - 1) * limit
    const paginatedVideos = videos.slice(offset, offset + limit)

    return {
      videos: paginatedVideos,
      total: videos.length,
      page,
      limit,
      query: data.query,
    }
  } catch (error) {
    logger.error(error)
    return new Response(JSON.stringify({ error: 'Failed to fetch search results' }), { status: 500 })
  }
}
