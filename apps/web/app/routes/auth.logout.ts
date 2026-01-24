import { logger } from '@shared/services/logger'
import type { ActionFunctionArgs } from 'react-router'
import { logout } from '~/services/auth.server'

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    return logout(request)
  } catch (error) {
    logger.error('Failed to logout ' + error)
    return new Response(JSON.stringify({ error: 'Sorry, there was a problem during logout.' }), {
      status: 500,
    })
  }
}
