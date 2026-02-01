import { generateChatSuggestions } from '@shared/services/chat'
import type { LoaderFunctionArgs } from 'react-router'
import { logger } from '@shared/services/logger'
import { getVideosMetadataSummary } from '@vector/services/db'
import { requireUserId } from '../services/user.sever'

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
