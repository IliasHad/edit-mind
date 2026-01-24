import { logger } from '@shared/services/logger'
import { type ActionFunctionArgs } from 'react-router'
import { backgroundJobsFetch } from '~/services/background.server'
import { requireUser } from '~/services/user.sever'

export async function action({ request }: ActionFunctionArgs) {
  try {
    const user = await requireUser(request)

    await backgroundJobsFetch(`/internal/indexer/retry`, undefined, user, 'POST')
    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (error) {
    logger.error('Error fetching folder details: ' + error)
    return new Response(JSON.stringify({ error: 'Failed to fetch folder details' }), { status: 500 })
  }
}
