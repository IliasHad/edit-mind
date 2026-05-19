import type { LoaderFunctionArgs } from 'react-router'
import { getUser } from '~/services/user.server'
import { getGroupedSearchSuggestions } from '@search/services/suggestion'
import { localizeCanonicalSuggestion } from '@search/utils/localizedQuery'
import { AppSettingsModel } from '@db/index'
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

    const language = await AppSettingsModel.getLanguage()
    const suggestions = await getGroupedSearchSuggestions(query, limitPerGroup, totalLimit)
    const localizedSuggestions = Object.fromEntries(
      Object.entries(suggestions).map(([type, items]) => [
        type,
        items.map((item) => localizeCanonicalSuggestion(item, language)),
      ])
    )

    return { suggestions: localizedSuggestions }
  } catch (error) {
    logger.error('Error fetching suggestions: ' + error)
    return new Response(JSON.stringify({ error: 'Failed to fetch suggestions' }), { status: 500 })
  }
}
