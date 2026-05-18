import { AccessTokenModel } from '@db/models/AccessToken'
import { logger } from '@shared/services/logger'
import { type ActionFunctionArgs } from 'react-router'
import { requireUserId } from '~/services/user.server'

export async function action({ request, params }: ActionFunctionArgs) {
  if (request.method !== 'DELETE') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const userId = await requireUserId(request)
    const { id } = params

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing token id' }), { status: 400 })
    }

    const result = await AccessTokenModel.deleteByOwner(id, userId)

    if (result.count === 0) {
      return new Response(JSON.stringify({ error: 'Token not found' }), { status: 404 })
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (error) {
    logger.error({ error }, 'Failed to revoke access token')
    return new Response(JSON.stringify({ error: 'Failed to revoke token' }), { status: 500 })
  }
}
