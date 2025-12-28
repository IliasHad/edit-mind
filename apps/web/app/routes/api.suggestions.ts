import { getGroupedSearchSuggestions } from '@search/services/suggestion';
import type { ActionFunctionArgs } from 'react-router'

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { query } = await request.json()

    if (!query || query.length < 2) {
      return { suggestions: {} }
    }

    const suggestions = await getGroupedSearchSuggestions(query)
    return { suggestions }
  } catch (error) {
    console.error('Suggestion error:', error)
    return { suggestions: {} }
  }
}
