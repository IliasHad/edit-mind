import { generateChatSuggestions } from '@search/services/chat'
import type { LoaderFunctionArgs } from 'react-router'
import { requireUserId } from '~/services/user.sever';
import { logger } from '@shared/services/logger'
import { getVideosMetadataSummary } from '@vector/services/vectorDb'

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    await requireUserId(request)

    const metadata = await getVideosMetadataSummary()
    const suggestions = generateChatSuggestions(metadata)

    return { suggestions }
  } catch (error) {
    logger.error('Error fetching suggestions: ' + error)
    return new Response(JSON.stringify({ error: 'Failed to fetch suggestions' }), { status: 500 })
  }
}
