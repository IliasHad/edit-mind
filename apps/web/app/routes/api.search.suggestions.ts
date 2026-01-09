import type { LoaderFunctionArgs } from 'react-router'
import { getUser } from '~/services/user.sever'
import { getGroupedSearchSuggestions } from '@search/services/suggestion';
import { logger } from '@shared/services/logger'

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const url = new URL(request.url)
  const query = url.searchParams.get('q') || ''
  const limitPerGroup = parseInt(url.searchParams.get('limitPerGroup') || '5', 10)
  const totalLimit = parseInt(url.searchParams.get('totalLimit') || '30', 10)

  try {
    if (!query || query.length < 2) {
      return { suggestions: [] }
    }

    const suggestions = await getGroupedSearchSuggestions(query, limitPerGroup, totalLimit)

    return { suggestions }
  } catch (error) {
    logger.error('Error fetching suggestions: ' + error)
    return new Response(JSON.stringify({ error: 'Failed to fetch suggestions' }), { status: 500 })
  }
}
